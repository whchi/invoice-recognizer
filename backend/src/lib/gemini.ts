import { GoogleGenAI, type Part, type Content, type GenerateContentConfig } from '@google/genai';
import { type ParseResult, parseGeminiJson } from './parse';

export interface GeminiSetupOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string;
}

export interface GeminiResponse {
  content: string;
  model: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiService {
  private readonly client: GoogleGenAI;
  private model: string;
  private temperature = 0.7;
  private maxTokens = 4096;
  private topP: number | null = null;
  private topK: number | null = null;
  private responseMimeType: string | null = null;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = 'gemini-2.0-flash';
  }

  /**
   * 設定 LLM 參數（fluent API，可 chain 呼叫）
   */
  setup(options: GeminiSetupOptions): this {
    if (options.temperature !== undefined) {
      this.temperature = Math.max(0.0, Math.min(2.0, options.temperature));
    }
    if (options.model !== undefined) {
      this.model = options.model;
    }
    if (options.maxTokens !== undefined) {
      this.maxTokens = options.maxTokens;
    }
    if (options.topP !== undefined) {
      this.topP = Math.max(0.0, Math.min(1.0, options.topP));
    }
    if (options.topK !== undefined) {
      this.topK = Math.max(1, options.topK);
    }
    if (options.responseMimeType !== undefined) {
      this.responseMimeType = options.responseMimeType;
    }
    return this;
  }

  getModel(): string {
    return this.model;
  }

  async send(userPrompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.sendWithMetadata(userPrompt, systemPrompt);
    return response.content;
  }

  async sendWithMetadata(userPrompt: string, systemPrompt?: string): Promise<GeminiResponse> {
    return this.generateContent([userPrompt], systemPrompt);
  }

  async sendWithImage(
    userPrompt: string,
    fileBase64: string,
    mimeType: string,
    systemPrompt?: string,
  ): Promise<string> {
    const response = await this.sendWithImageMetadata(userPrompt, fileBase64, mimeType, systemPrompt);
    return response.content;
  }

  async sendWithImageMetadata(
    userPrompt: string,
    fileBase64: string,
    mimeType: string,
    systemPrompt?: string,
  ): Promise<GeminiResponse> {
    const parts: Part[] = [];

    if (userPrompt) {
      parts.push({ text: userPrompt });
    }

    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType,
      },
    });

    return this.generateContent(parts, systemPrompt);
  }

  /**
   * sendWithImage + parseGeminiJson（相容原本 callGemini 的回傳格式）
   */
  async sendWithImageParsed(
    userPrompt: string,
    fileBase64: string,
    mimeType: string,
    systemPrompt?: string,
  ): Promise<ParseResult> {
    const response = await this.sendWithImageMetadata(userPrompt, fileBase64, mimeType, systemPrompt);
    return parseGeminiJson(response.content);
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await this.chatWithMetadata(messages);
    return response.content;
  }

  async chatWithMetadata(messages: Array<{ role: string; content: string }>): Promise<GeminiResponse> {
    let systemInstruction: string | undefined;
    const contents: Content[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemInstruction = message.content;
      } else {
        contents.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        });
      }
    }

    return this.generateContent(contents, systemInstruction);
  }

  private buildConfig(systemPrompt?: string): GenerateContentConfig {
    const config: GenerateContentConfig = {
      temperature: this.temperature,
      maxOutputTokens: this.maxTokens,
    };

    if (this.topP !== null) {
      config.topP = this.topP;
    }
    if (this.topK !== null) {
      config.topK = this.topK;
    }
    if (this.responseMimeType !== null) {
      config.responseMimeType = this.responseMimeType;
    }
    if (systemPrompt) {
      config.systemInstruction = systemPrompt;
    }

    return config;
  }

  private async generateContent(
    contents: Part[] | Content[] | string[],
    systemPrompt?: string,
  ): Promise<GeminiResponse> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: this.buildConfig(systemPrompt),
      });

      const text = response.text;
      if (!text) {
        throw new Error('gemini_empty_response');
      }

      return {
        content: text,
        model: response.modelVersion ?? this.model,
        finishReason: response.candidates?.[0]?.finishReason ?? null,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.startsWith('gemini_') || error.message.startsWith('transient_')) {
          throw error;
        }

        // SDK wraps HTTP errors — detect transient (429/5xx) vs permanent
        const statusMatch = error.message.match(/\b(429|5\d{2})\b/);
        if (statusMatch) {
          throw new Error(`transient_upstream: ${statusMatch[1]} ${error.message}`);
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error(`transient_network: ${error.message}`);
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`gemini_api_error: ${message}`);
    }
  }
}
