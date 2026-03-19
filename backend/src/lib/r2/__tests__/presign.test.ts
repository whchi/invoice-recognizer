import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  generatePresignedUploadUrl,
  getExtensionForMime,
  isAllowedMimeType,
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validateUpload,
} from '../presign';

// ---------------------------------------------------------------------------
// Mock aws4fetch so we never make real HTTP requests
// ---------------------------------------------------------------------------

vi.mock('aws4fetch', () => {
  return {
    AwsClient: class MockAwsClient {
      async sign(url: string) {
        return { url: `${url}&X-Amz-Signature=mock-signature` };
      }
    },
  };
});

// Mock ulid for deterministic key generation
vi.mock('ulid', () => ({
  ulid: vi.fn(() => '01HZTEST1234567890ABCDEF'),
}));

// ---------------------------------------------------------------------------
// isAllowedMimeType
// ---------------------------------------------------------------------------

describe('isAllowedMimeType', () => {
  it.each([
    ['image/jpeg', true],
    ['image/png', true],
    ['application/pdf', true],
    ['text/plain', false],
    ['image/gif', false],
    ['application/json', false],
    ['', false],
  ])('returns %s for "%s"', (mime, expected) => {
    expect(isAllowedMimeType(mime)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// getExtensionForMime
// ---------------------------------------------------------------------------

describe('getExtensionForMime', () => {
  it('returns jpg for image/jpeg', () => {
    expect(getExtensionForMime('image/jpeg')).toBe('jpg');
  });

  it('returns png for image/png', () => {
    expect(getExtensionForMime('image/png')).toBe('png');
  });

  it('returns pdf for application/pdf', () => {
    expect(getExtensionForMime('application/pdf')).toBe('pdf');
  });
});

// ---------------------------------------------------------------------------
// validateUpload
// ---------------------------------------------------------------------------

describe('validateUpload', () => {
  it('does not throw for valid MIME + size', () => {
    expect(() => validateUpload('image/jpeg', 1024)).not.toThrow();
    expect(() => validateUpload('image/png', 5 * 1024 * 1024)).not.toThrow();
    expect(() => validateUpload('application/pdf', MAX_UPLOAD_BYTES)).not.toThrow();
  });

  it('accepts exactly MAX_UPLOAD_BYTES', () => {
    expect(() => validateUpload('image/jpeg', MAX_UPLOAD_BYTES)).not.toThrow();
  });

  it('throws UploadValidationError for unsupported MIME type', () => {
    expect(() => validateUpload('text/plain', 1024)).toThrow(UploadValidationError);
    expect(() => validateUpload('text/plain', 1024)).toThrow(/Unsupported file type/);
  });

  it('throws UploadValidationError for image/gif', () => {
    expect(() => validateUpload('image/gif', 1024)).toThrow(UploadValidationError);
  });

  it('throws UploadValidationError when size exceeds 15 MiB', () => {
    const overSize = MAX_UPLOAD_BYTES + 1;
    expect(() => validateUpload('image/jpeg', overSize)).toThrow(UploadValidationError);
    expect(() => validateUpload('image/jpeg', overSize)).toThrow(/File too large/);
  });

  it('throws for invalid MIME before checking size', () => {
    const overSize = MAX_UPLOAD_BYTES + 1;
    expect(() => validateUpload('text/html', overSize)).toThrow(/Unsupported file type/);
  });
});

// ---------------------------------------------------------------------------
// generatePresignedUploadUrl
// ---------------------------------------------------------------------------

describe('generatePresignedUploadUrl', () => {
  const baseParams = {
    accessKeyId: 'test-key-id',
    bucketName: 'invoice-recognizer-r2',
    contentType: 'image/jpeg' as const,
    endpoint: 'https://test-account.r2.cloudflarestorage.com',
    filename: 'invoice.jpg',
    secretAccessKey: 'test-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns r2Key with tmp/ prefix and invoice_ pattern', async () => {
    const result = await generatePresignedUploadUrl(baseParams);
    expect(result.r2Key).toMatch(/^tmp\/invoice_[A-Z0-9]+\.jpg$/);
    expect(result.r2Key).toBe('tmp/invoice_01HZTEST1234567890ABCDEF.jpg');
  });

  it('uses correct extension for each MIME type', async () => {
    const jpegResult = await generatePresignedUploadUrl({
      ...baseParams,
      contentType: 'image/jpeg',
    });
    expect(jpegResult.r2Key).toMatch(/\.jpg$/);

    const pngResult = await generatePresignedUploadUrl({
      ...baseParams,
      contentType: 'image/png',
    });
    expect(pngResult.r2Key).toMatch(/\.png$/);

    const pdfResult = await generatePresignedUploadUrl({
      ...baseParams,
      contentType: 'application/pdf',
    });
    expect(pdfResult.r2Key).toMatch(/\.pdf$/);
  });

  it('returns a presigned upload URL string', async () => {
    const result = await generatePresignedUploadUrl(baseParams);
    expect(result.uploadUrl).toContain('https://test-account.r2.cloudflarestorage.com');
    expect(result.uploadUrl).toContain('invoice-recognizer-r2');
    expect(result.uploadUrl).toContain('X-Amz-Expires=300');
  });

  it('returns an expiresAt Date in the future', async () => {
    const before = Date.now();
    const result = await generatePresignedUploadUrl(baseParams);
    const after = Date.now();

    expect(result.expiresAt).toBeInstanceOf(Date);
    // Should be ~300s (5 min) in the future
    const expiresMs = result.expiresAt.getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 300 * 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + 300 * 1000);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('MAX_UPLOAD_BYTES is 15 MiB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(15 * 1024 * 1024);
  });

  it('ALLOWED_MIME_TYPES has exactly 3 entries', () => {
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
  });
});
