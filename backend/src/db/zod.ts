import { z } from 'zod';

// Tasks
export const taskSelectSchema = z.object({
  createdAt: z.date(),
  errorCode: z.string().nullable(),
  id: z.string(),
  idempotencyKey: z.string().nullable(),
  r2Key: z.string(),
  status: z.string(),
  templateId: z.string().nullable(),
  updatedAt: z.date(),
  userId: z.string().nullable(),
});

export const taskInsertSchema = z.object({
  createdAt: z.date().optional(),
  errorCode: z.string().nullable().optional(),
  id: z.string().optional(),
  idempotencyKey: z.string().nullable().optional(),
  r2Key: z.string(),
  status: z.string().optional(),
  templateId: z.string().nullable().optional(),
  updatedAt: z.date().optional(),
  userId: z.string().nullable().optional(),
});

// Templates
export const templateSelectSchema = z.object({
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  fields: z.string(),
  id: z.string(),
  isSystem: z.number(),
  name: z.string(),
});

export const templateInsertSchema = z.object({
  createdAt: z.date().optional(),
  createdBy: z.string().nullable().optional(),
  fields: z.string(),
  id: z.string().optional(),
  isSystem: z.number().optional(),
  name: z.string(),
});

// API Keys
export const apiKeySelectSchema = z.object({
  createdAt: z.date(),
  id: z.string(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  name: z.string(),
  revokedAt: z.date().nullable(),
  userId: z.string(),
});

// Credit Wallet
export const creditWalletSelectSchema = z.object({
  balance: z.number(),
  updatedAt: z.date(),
  userId: z.string(),
});

// Users (better-auth schema)
export const userSelectSchema = z.object({
  createdAt: z.date(),
  defaultTemplateId: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  id: z.string(),
  image: z.string().nullable(),
  name: z.string(),
  updatedAt: z.date(),
});

export const userInsertSchema = z.object({
  createdAt: z.date().optional(),
  defaultTemplateId: z.string().nullable().optional(),
  email: z.string(),
  emailVerified: z.boolean().optional(),
  id: z.string().optional(),
  image: z.string().nullable().optional(),
  name: z.string(),
  updatedAt: z.date().optional(),
});

// User Daily Usage
export const userDailyUsageSelectSchema = z.object({
  count: z.number(),
  date: z.string(),
  userId: z.string(),
});

// Redeem Codes
export const redeemCodesSelectSchema = z.object({
  codeHash: z.string(),
  createdAt: z.date(),
  credits: z.number(),
  id: z.string(),
  redeemedAt: z.date().nullable(),
  redeemedBy: z.string().nullable(),
});

// Type inference
export type TaskSelect = z.infer<typeof taskSelectSchema>;
export type TaskInsert = z.infer<typeof taskInsertSchema>;

export type TemplateSelect = z.infer<typeof templateSelectSchema>;
export type TemplateInsert = z.infer<typeof templateInsertSchema>;

export type ApiKeySelect = z.infer<typeof apiKeySelectSchema>;

export type CreditWalletSelect = z.infer<typeof creditWalletSelectSchema>;

export type UserSelect = z.infer<typeof userSelectSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;

export type UserDailyUsageSelect = z.infer<typeof userDailyUsageSelectSchema>;

export type RedeemCodesSelect = z.infer<typeof redeemCodesSelectSchema>;
