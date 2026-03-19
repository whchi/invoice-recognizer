import { z } from 'zod';
import 'zod-openapi/extend';

export const CreateCodesBodySchema = z
  .object({
    count: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .openapi({ description: 'Number of codes to generate (1-100)', example: 5 }),
    credits: z.number().positive().openapi({ description: 'Credit value for each code', example: 100 }),
  })
  .openapi({ ref: 'CreateCodesBody' });

export const CreateCodesResponseSchema = z
  .object({
    codes: z.array(z.string()).openapi({ example: ['ABCD-EFGH-IJKL-MNOP'] }),
  })
  .openapi({ ref: 'CreateCodesResponse' });

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Forbidden' }),
  })
  .openapi({ ref: 'ErrorResponse' });
