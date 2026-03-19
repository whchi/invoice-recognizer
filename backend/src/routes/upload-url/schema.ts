import { z } from 'zod';
import 'zod-openapi/extend';

export const UploadBodySchema = z
  .object({
    contentType: z.string().openapi({ example: 'image/jpeg' }),
    filename: z.string().openapi({ example: 'invoice.jpg' }),
    size: z.number().openapi({ example: 102400 }),
  })
  .openapi({ ref: 'UploadBody' });

export const UploadResponseSchema = z
  .object({
    expiresAt: z.string().openapi({ example: '2026-02-24T12:05:00.000Z' }),
    r2Key: z.string().openapi({ example: 'tmp/invoice_abc123.jpg' }),
    uploadUrl: z.string().openapi({ example: 'https://r2.cloudflarestorage.com/...' }),
  })
  .openapi({ ref: 'UploadResponse' });

export const UploadErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'invalid_upload' }),
    message: z.string().openapi({ example: 'Missing required fields: filename, contentType, size.' }),
  })
  .openapi({ ref: 'UploadError' });
