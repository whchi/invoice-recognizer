import { AwsClient } from 'aws4fetch';
import { ulid } from 'ulid';

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** 15 MiB in bytes */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Validation helpers (exported for testing)
// ---------------------------------------------------------------------------

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function getExtensionForMime(mime: AllowedMimeType): string {
  return MIME_TO_EXT[mime];
}

export function validateUpload(contentType: string, size: number): void {
  if (!isAllowedMimeType(contentType)) {
    throw new UploadValidationError(`Unsupported file type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError('File too large. Max 15 MiB.');
  }
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

// ---------------------------------------------------------------------------
// Presigned URL generation
// ---------------------------------------------------------------------------

export interface GeneratePresignedUrlParams {
  filename: string;
  contentType: AllowedMimeType;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string; // e.g https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  bucketName: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  r2Key: string;
  expiresAt: Date;
}

export async function generatePresignedUploadUrl(params: GeneratePresignedUrlParams): Promise<PresignedUrlResult> {
  const { contentType, accessKeyId, secretAccessKey, endpoint, bucketName } = params;

  const ext = getExtensionForMime(contentType);
  const id = ulid();
  const r2Key = `tmp/invoice_${id}.${ext}`;

  const client = new AwsClient({
    accessKeyId,
    region: 'auto',
    secretAccessKey,
    service: 's3',
  });

  const url = new URL(`${endpoint}/${bucketName}/${r2Key}`);
  url.searchParams.set('X-Amz-Expires', String(PRESIGN_EXPIRY_SECONDS));

  const signed = await client.sign(url.toString(), {
    aws: { signQuery: true },
    headers: { 'Content-Type': contentType },
    method: 'PUT',
  });

  const expiresAt = new Date(Date.now() + PRESIGN_EXPIRY_SECONDS * 1000);

  return {
    expiresAt,
    r2Key,
    uploadUrl: signed.url,
  };
}
