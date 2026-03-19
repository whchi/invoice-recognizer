import { z } from 'zod';
import 'zod-openapi/extend';

export const WalletResponseSchema = z
  .object({
    balance: z.number().openapi({ example: 100 }),
    dailyDate: z.string().openapi({ example: '2026-02-24' }),
    dailyRemaining: z.number().openapi({ example: 7 }),
    dailyUsed: z.number().openapi({ example: 3 }),
  })
  .openapi({ ref: 'WalletResponse' });

export const RedeemBodySchema = z
  .object({
    code: z.string().optional().openapi({ example: 'ABCD-EFGH-IJKL-MNOP' }),
  })
  .passthrough()
  .openapi({ ref: 'RedeemBody' });

export const RedeemResponseSchema = z
  .object({
    credits: z.number().openapi({ example: 50 }),
    newBalance: z.number().openapi({ example: 150 }),
  })
  .openapi({ ref: 'RedeemResponse' });

export const CreditsErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Unauthorized' }),
  })
  .openapi({ ref: 'CreditsError' });
