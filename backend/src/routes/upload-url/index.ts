import {
  type AllowedMimeType,
  generatePresignedUploadUrl,
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validateUpload,
} from '@backend/lib/r2/presign';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { UploadErrorSchema, UploadResponseSchema } from './schema';

export const uploadUrl = new Hono<{ Bindings: Bindings; Variables: Variables }>();

uploadUrl.post(
  '/',
  describeRoute({
    description: 'Generate a presigned URL for uploading an invoice file to R2.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(UploadResponseSchema) } },
        description: 'Presigned upload URL generated successfully',
      },
      400: {
        content: { 'application/json': { schema: resolver(UploadErrorSchema) } },
        description: 'Invalid upload request',
      },
      413: {
        content: { 'application/json': { schema: resolver(UploadErrorSchema) } },
        description: 'File too large',
      },
      500: {
        content: { 'application/json': { schema: resolver(UploadErrorSchema) } },
        description: 'Server error generating upload URL',
      },
    },
    summary: 'Generate presigned upload URL',
    tags: ['Upload'],
  }),
  async c => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_upload', message: 'Invalid JSON body.' }, 400);
    }

    const { filename, contentType, size } = body;

    if (!filename || !contentType || size == null) {
      return c.json({ error: 'invalid_upload', message: 'Missing required fields: filename, contentType, size.' }, 400);
    }

    try {
      validateUpload(String(contentType), Number(size));
    } catch (err) {
      if (err instanceof UploadValidationError) {
        const status = Number(size) > MAX_UPLOAD_BYTES ? 413 : 400;
        return c.json({ error: 'invalid_upload', message: err.message }, status);
      }
      throw err;
    }

    try {
      const result = await generatePresignedUploadUrl({
        accessKeyId: c.env.R2_ACCESS_KEY_ID,
        bucketName: c.env.R2_BUCKET_NAME,
        contentType: String(contentType) as AllowedMimeType,
        endpoint: c.env.R2_S3_ENDPOINT,
        filename: String(filename),
        secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
      });

      return c.json(
        {
          expiresAt: result.expiresAt.toISOString(),
          r2Key: result.r2Key,
          uploadUrl: result.uploadUrl,
        },
        200,
      );
    } catch (err) {
      console.error('Failed to generate presigned URL:', err);
      return c.json({ error: 'server_error', message: 'Failed to generate upload URL.' }, 500);
    }
  },
);
