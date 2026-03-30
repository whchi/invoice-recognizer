import { z } from 'zod';
import 'zod-openapi/extend';

export const CreateTaskBodySchema = z
  .object({
    disclaimerAccepted: z.boolean().optional().openapi({ example: true }),
    idempotencyKey: z.string().optional().openapi({ example: 'unique-key-123' }),
    r2Key: z.string().optional().openapi({ example: 'tmp/invoice_abc123.jpg' }),
    templateId: z.string().optional().openapi({ example: '01HXYZ...' }),
  })
  .passthrough()
  .openapi({ ref: 'CreateTaskBody' });

export const TaskResponseSchema = z
  .object({
    createdAt: z.string().nullable().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    id: z.string().openapi({ example: '01HXYZ...' }),
    status: z.string().openapi({ example: 'queued' }),
  })
  .passthrough()
  .openapi({ ref: 'TaskResponse' });

export const TaskIdParamSchema = z
  .object({
    id: z.string().openapi({ description: 'Task ID', example: '01HXYZ...' }),
  })
  .openapi({ ref: 'TaskIdParam' });

export const TasksErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'unauthorized' }),
  })
  .openapi({ ref: 'TasksError' });

export const ExportFormatSchema = z.enum(['json', 'csv', 'xml']).openapi({ ref: 'ExportFormat', example: 'json' });

export const ExportQuerySchema = z
  .object({
    format: ExportFormatSchema.optional().default('json'),
  })
  .openapi({ ref: 'ExportQuery' });

export const ExportResponseSchema = z
  .union([
    z.string().openapi({ description: 'Exported data' }),
    z.object({ error: z.string() }).openapi({ description: 'Error response' }),
  ])
  .openapi({ ref: 'ExportResponse' });
