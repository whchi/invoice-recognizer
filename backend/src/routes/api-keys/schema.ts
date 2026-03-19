import { z } from 'zod';
import 'zod-openapi/extend';

export const ApiKeySchema = z
  .object({
    createdAt: z.string().nullable().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    id: z.string().openapi({ example: '01HXYZ...' }),
    name: z.string().openapi({ example: 'My API Key' }),
    prefix: z.string().openapi({ example: 'inv_abcd' }),
    revokedAt: z.string().nullable().openapi({ example: null }),
  })
  .openapi({ ref: 'ApiKey' });

export const ApiKeyListResponseSchema = z
  .object({
    keys: z.array(ApiKeySchema),
  })
  .openapi({ ref: 'ApiKeyListResponse' });

export const CreateApiKeyBodySchema = z
  .object({
    name: z.string().optional().openapi({ example: 'My API Key' }),
  })
  .passthrough()
  .openapi({ ref: 'CreateApiKeyBody' });

export const CreateApiKeyResponseSchema = z
  .object({
    createdAt: z.string().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    fullKey: z.string().openapi({ example: 'inv_abcdefghijklmnop' }),
    id: z.string().openapi({ example: '01HXYZ...' }),
    name: z.string().openapi({ example: 'My API Key' }),
    prefix: z.string().openapi({ example: 'inv_abcd' }),
  })
  .openapi({ ref: 'CreateApiKeyResponse' });

export const IdParamSchema = z
  .object({
    id: z.string().openapi({ description: 'API key ID', example: '01HXYZ...' }),
  })
  .openapi({ ref: 'IdParam' });

export const SuccessResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
  })
  .openapi({ ref: 'SuccessResponse' });

export const RotateKeyResponseSchema = z
  .object({
    createdAt: z.string().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    fullKey: z.string().openapi({ example: 'inv_newkeyvalue' }),
    id: z.string().openapi({ example: '01HXYZ...' }),
    name: z.string().openapi({ example: 'My API Key' }),
    prefix: z.string().openapi({ example: 'inv_newk' }),
  })
  .openapi({ ref: 'RotateKeyResponse' });

export const ApiKeysErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Unauthorized' }),
  })
  .openapi({ ref: 'ApiKeysError' });
