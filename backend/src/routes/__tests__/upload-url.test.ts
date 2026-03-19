import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadUrl } from '../upload-url/index';

vi.mock('@backend/lib/r2/presign', () => ({
  generatePresignedUploadUrl: vi.fn().mockResolvedValue({
    expiresAt: new Date('2026-02-24T12:05:00Z'),
    r2Key: 'tmp/invoice_test123.jpg',
    uploadUrl: 'https://test-account.r2.cloudflarestorage.com/bucket/tmp/invoice_test123.jpg?X-Amz-Signature=mock',
  }),
  MAX_UPLOAD_BYTES: 15 * 1024 * 1024,
  UploadValidationError: class UploadValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UploadValidationError';
    }
  },
  validateUpload: vi.fn(),
}));

vi.mock('aws4fetch', () => ({
  AwsClient: class MockAwsClient {
    async sign(url: string) {
      return { url: `${url}&X-Amz-Signature=mock` };
    }
  },
}));

vi.mock('ulid', () => ({
  ulid: vi.fn(() => 'test123'),
}));

describe('POST /api/upload-url', () => {
  let mockValidateUpload: ReturnType<typeof vi.fn>;
  let mockGeneratePresignedUploadUrl: ReturnType<typeof vi.fn>;
  let mockEnv: Bindings;

  beforeEach(async () => {
    vi.clearAllMocks();

    const presignModule = await import('@backend/lib/r2/presign');
    mockValidateUpload = vi.mocked(presignModule.validateUpload);
    mockGeneratePresignedUploadUrl = vi.mocked(presignModule.generatePresignedUploadUrl);

    mockEnv = {
      ADMIN_SECRET: 'admin-secret',
      BETTER_AUTH_SECRET: 'auth-secret',
      BETTER_AUTH_URL: 'http://localhost:3000',
      DB: {} as any,
      GEMINI_API_KEY: 'test-key',
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      R2_ACCESS_KEY_ID: 'test-access-key-id',
      R2_BUCKET: {} as any,
      R2_BUCKET_NAME: 'invoice-recognizer-r2',
      R2_S3_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      RATE_LIMIT: {} as any,
      TASK_QUEUE: {} as any,
    };
  });

  it('returns 200 with uploadUrl and r2Key on valid request', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          contentType: 'image/jpeg',
          filename: 'invoice.jpg',
          size: 1024,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('uploadUrl');
    expect(json).toHaveProperty('r2Key');
    expect(String(json.uploadUrl)).toContain('https://');
    expect(json.r2Key).toBe('tmp/invoice_test123.jpg');
  });

  it('returns 400 when filename is missing', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          contentType: 'image/jpeg',
          size: 1024,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(400);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('error');
  });

  it('returns 400 when contentType is missing', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          filename: 'invoice.jpg',
          size: 1024,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(400);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('error');
  });

  it('returns 400 when size is missing', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          contentType: 'image/jpeg',
          filename: 'invoice.jpg',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(400);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('error');
  });

  it('returns 400 for unsupported MIME type', async () => {
    const { UploadValidationError } = await import('@backend/lib/r2/presign');
    mockValidateUpload.mockImplementationOnce(() => {
      throw new UploadValidationError('Unsupported file type: text/plain');
    });

    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          contentType: 'text/plain',
          filename: 'document.txt',
          size: 1024,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(400);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('error');
  });

  it('returns 413 when file exceeds MAX_UPLOAD_BYTES', async () => {
    const { UploadValidationError, MAX_UPLOAD_BYTES } = await import('@backend/lib/r2/presign');
    const oversizeFile = MAX_UPLOAD_BYTES + 1;
    mockValidateUpload.mockImplementationOnce(() => {
      throw new UploadValidationError('File too large. Max 15 MiB.');
    });

    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().route('/api/upload-url', uploadUrl);

    const response = await app.request(
      '/api/upload-url',
      {
        body: JSON.stringify({
          contentType: 'application/pdf',
          filename: 'large.pdf',
          size: oversizeFile,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(response.status).toBe(413);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).toHaveProperty('error');
  });
});
