export const LEGACY_TAIWAN_FIELDS = [
  'is_invoice',
  'document_type',
  'expense_date',
  'invoice_number',
  'locale',
  'amount',
  'currency',
] as const;

const LEGACY_SYSTEM_PROMPT =
  'You are an expert Financial Document Parser and OCR Specialist, strictly focused on Taiwan and International financial documents. Your task is to analyze the provided image to determine if it is a valid financial document and extract specific data points based on document type.';

const LEGACY_USER_PROMPT = `### Processing Logic

1. **Classification & Type Detection:**
   * **Identify Document Type:**
     * **Invoice (\`invoice\`):**
       * **Taiwan:** Look for "統一發票" (Unified Invoice), "三聯式", or the specific format of **2 uppercase letters followed by 8 digits** (e.g., AB-12345678).
       * **China/International:** Official Tax Invoices (e.g., "增值稅發票", "專用發票") containing a clear Invoice Code/Number.
     * **Receipt (\`receipt\`):**
       * **Keywords:** Look for "收據" (Receipt), "免用統一發票", "證明單", "乘車證明" (Taxi), "購票證明", "停車費", "通行費".
       * **MANDATORY VALIDATION:** To be classified as a valid \`receipt\`, the document **MUST** contain at least one of the following:
         1.  **A visible Payment Amount** (金額/總計/Total).
         2.  **A Tax ID Number** (統一編號/統編).
       * *If the document has receipt keywords but lacks BOTH Amount and Tax ID, classify as \`none\`.*
     * **None (\`none\`) - STRICT EXCLUSIONS:**
       * **Invalid Receipts:** Documents missing both Amount and Tax ID.
       * **Boarding Passes (登機證):** Flight tickets/passes are NOT receipts.
       * **General Tickets (車票/門票):** Admission/Seat tickets are "no", UNLESS they explicitly state "購票證明" or have a Tax ID.
       * **Credit Card Slips:** Payment terminal slips without item details.
       * **Others:** Landscape, people, or non-financial documents.

   * **Validity Check:**
     * If \`document_type\` is \`invoice\` or \`receipt\`: Set \`is_invoice\` to "yes".
     * If \`document_type\` is \`none\` (including Boarding Passes or Empty Receipts): Set \`is_invoice\` to "no".

2. **Extraction (Only if \`is_invoice\` is "yes"):**
   * **Locale:** Identify the origin (Priority: Taiwan \`zh-TW\`, then China \`zh-CN\`, etc.).
   * **Expense Date:** Extract the transaction date (YYYY-MM-DD).
   * **Invoice Number OR Date (Field Overloading):**
     * **CASE A: Type \`invoice\`:** Extract the unique invoice number.
       * **Taiwan:** **MANDATORY:** Must include the **2 English letters prefix** followed by 8 digits (e.g., "AB-12345678"). Do not extract the digits alone.
       * **Others:** Extract the official Invoice Number/Code.
     * **CASE B: Type \`receipt\`:** Extract the **Transaction Date** to map to this field.
       * **Source:** Use the main date of the receipt (Transaction date/Purchase date).
       * **ROC Conversion:** If the date is in ROC format (e.g., "113年"), convert to Gregorian (113 + 1911 = 2024). If no year is found, assume the current year.
       * **Format:** Strictly use **"YYYYMMDD"** (e.g., "20241230"). **Do not** include hyphens or time.
   * **Amount:**
     * **Taiwan Origin:** Extract "Total Amount" (總計/總額/合計).
     * **Non-Taiwan:** Extract "Grand Total" or "Total to Pay".
   * **Currency:** Detect the currency code (default to TWD for Taiwan documents if symbol is $, NT$, or implicit).

3. **Formatting:**
   * All output values must be **Strings**.
   * Strip currency symbols and commas from the amount.

### Output Schema (JSON)
Return the data in the following strictly valid JSON format. Do not wrap the output in markdown code blocks.

{
  "is_invoice": "String. \\"yes\\" or \\"no\\".",
  "document_type": "String. \\"invoice\\", \\"receipt\\", or \\"none\\".",
  "expense_date": "String (YYYY-MM-DD). Use \\"\\" if missing or is_invoice is no.",
  "invoice_number": "String. If Invoice: \\"AB-12345678\\". If Receipt: \\"YYYYMMDD\\". Use \\"\\" if missing or is_invoice is no.",
  "locale": "String (RFC 5646 code, e.g., zh-TW). Use \\"\\" if not an invoice.",
  "amount": "String. Numerical value only. Use \\"\\" if missing.",
  "currency": "String (ISO 4217 code, e.g., TWD). Use \\"\\" if missing."
}

### Constraints
- Return **ONLY** valid JSON.
- **Strictly** enforce that Receipts must have an **Amount** OR a **Tax ID**. If neither exists, \`is_invoice\` is "no".
- For Receipts, \`invoice_number\` must be the **Date (YYYYMMDD)**.`;

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert Financial Document Parser and OCR Specialist. Your task is to analyze the provided image/document and extract specific data fields as instructed.';

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildGenericUserPrompt(fields: string[]): string {
  const schemaLines = fields.map(f => `  "${f}": "String value or empty string"`).join(',\n');

  return `Extract the following fields from the provided document. Return ONLY valid JSON with exactly these keys: ${fields.join(', ')}.
All values must be strings. If a field is not found, use an empty string "".
Do not wrap the output in markdown code blocks. Return raw JSON only.

Output Schema:
{
${schemaLines}
}`;
}

export function buildGeminiPrompt(
  templateFields: string[],
  systemOverride?: string,
): { systemPrompt: string; userPrompt: string } {
  const isLegacy = arraysEqual(templateFields, LEGACY_TAIWAN_FIELDS);

  if (isLegacy) {
    return {
      systemPrompt: systemOverride ?? LEGACY_SYSTEM_PROMPT,
      userPrompt: LEGACY_USER_PROMPT,
    };
  }

  return {
    systemPrompt: systemOverride ?? DEFAULT_SYSTEM_PROMPT,
    userPrompt: buildGenericUserPrompt(templateFields),
  };
}

export type ParseSuccess = { ok: true; data: unknown };
export type ParseFailure = {
  ok: false;
  error: 'model_invalid_json';
  detail: string;
};
export type ParseResult = ParseSuccess | ParseFailure;

export function parseGeminiJson(text: string): ParseResult {
  let stripped = text.trim();

  stripped = stripped.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: 'model_invalid_json', detail: message };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'model_invalid_json',
      detail: 'expected plain object',
    };
  }

  return { ok: true, data: parsed };
}

// --- Template validation for parsed Gemini output ---

export type ValidateSuccess = {
  ok: true;
  validated: Record<string, string>;
};

export type ValidateFailure = {
  ok: false;
  error: 'model_schema_mismatch';
  missing: string[];
  extra: string[];
};

export type ValidateResult = ValidateSuccess | ValidateFailure;

/**
 * Validates parsed Gemini output against the template field list.
 * All template fields must be present, no extra keys allowed,
 * and all values must be strings.
 */
export function validateAgainstTemplate(data: unknown, fields: string[]): ValidateResult {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      error: 'model_schema_mismatch',
      missing: [...fields],
      extra: [],
    };
  }

  const record = data as Record<string, unknown>;
  const dataKeys = Object.keys(record);
  const fieldSet = new Set(fields);
  const dataKeySet = new Set(dataKeys);

  const missing = fields.filter(f => !dataKeySet.has(f));
  const extra = dataKeys.filter(k => !fieldSet.has(k));

  if (missing.length > 0 || extra.length > 0) {
    return { ok: false, error: 'model_schema_mismatch', missing, extra };
  }

  // Verify all values are strings
  for (const key of fields) {
    if (typeof record[key] !== 'string') {
      return {
        ok: false,
        error: 'model_schema_mismatch',
        missing: [],
        extra: [],
      };
    }
  }

  const validated: Record<string, string> = {};
  for (const key of fields) {
    validated[key] = record[key] as string;
  }

  return { ok: true, validated };
}
