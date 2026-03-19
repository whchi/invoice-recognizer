import { z } from 'zod';
import 'zod-openapi/extend';

export const TemplateSchema = z
  .object({
    createdAt: z.string().nullable().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    createdBy: z.string().nullable().openapi({ example: '01HXYZ...' }),
    fields: z.array(z.string()).openapi({ example: ['vendor', 'amount', 'date'] }),
    id: z.string().openapi({ example: '01HXYZ...' }),
    name: z.string().openapi({ example: 'Standard Invoice' }),
  })
  .passthrough()
  .openapi({ ref: 'Template' });

export const TemplateListResponseSchema = z
  .object({
    templates: z.array(TemplateSchema),
  })
  .openapi({ ref: 'TemplateListResponse' });

export const CreateTemplateBodySchema = z
  .object({
    fields: z
      .any()
      .optional()
      .openapi({ example: ['vendor', 'amount'] }),
    name: z.string().optional().openapi({ example: 'Standard Invoice' }),
  })
  .passthrough()
  .openapi({ ref: 'CreateTemplateBody' });

export const CreateTemplateResponseSchema = z
  .object({
    id: z.string().openapi({ example: '01HXYZ...' }),
  })
  .openapi({ ref: 'CreateTemplateResponse' });

export const UpdateTemplateBodySchema = z
  .object({
    fields: z
      .array(z.string())
      .optional()
      .openapi({ example: ['vendor', 'amount', 'date'] }),
    name: z.string().optional().openapi({ example: 'Updated Invoice' }),
  })
  .passthrough()
  .openapi({ ref: 'UpdateTemplateBody' });

export const IdParamSchema = z
  .object({
    id: z.string().openapi({ description: 'Template ID', example: '01HXYZ...' }),
  })
  .openapi({ ref: 'TemplateIdParam' });

export const OkResponseSchema = z
  .object({
    ok: z.boolean().openapi({ example: true }),
  })
  .openapi({ ref: 'OkResponse' });

export const FavoriteResponseSchema = z
  .object({
    favorited: z.boolean().openapi({ example: true }),
    ok: z.boolean().openapi({ example: true }),
  })
  .openapi({ ref: 'FavoriteResponse' });

export const TemplatesErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'validation' }),
    message: z.string().openapi({ example: 'Name is required.' }),
  })
  .openapi({ ref: 'TemplatesError' });
