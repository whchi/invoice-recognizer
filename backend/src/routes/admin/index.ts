import { generateRedeemCode } from '@backend/lib/credits';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { CreateCodesResponseSchema, ErrorResponseSchema } from './schema';

export const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

admin.post(
  '/codes',
  describeRoute({
    description: 'Generate one or more redeem codes with a specified credit value. Requires admin secret.',
    responses: {
      201: {
        content: { 'application/json': { schema: resolver(CreateCodesResponseSchema) } },
        description: 'Codes generated successfully',
      },
      400: {
        content: { 'application/json': { schema: resolver(ErrorResponseSchema) } },
        description: 'Invalid request body',
      },
      403: {
        content: { 'application/json': { schema: resolver(ErrorResponseSchema) } },
        description: 'Forbidden — invalid admin secret',
      },
      503: {
        content: { 'application/json': { schema: resolver(ErrorResponseSchema) } },
        description: 'Admin API not configured',
      },
    },
    summary: 'Generate redeem codes',
    tags: ['Admin'],
  }),
  async c => {
    const adminSecret = c.env.ADMIN_SECRET;
    if (!adminSecret) {
      return c.json({ error: 'Admin API not configured' }, 503);
    }

    const providedSecret = c.req.header('x-admin-secret');
    if (providedSecret !== adminSecret) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    let body: { credits?: number; count?: number };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const credits = body.credits;
    if (typeof credits !== 'number' || credits <= 0) {
      return c.json({ error: 'credits must be a positive number' }, 400);
    }

    const count = body.count ?? 1;
    if (typeof count !== 'number' || count < 1 || count > 100) {
      return c.json({ error: 'count must be between 1 and 100' }, 400);
    }

    const db = c.var.db;

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const result = await generateRedeemCode(credits, db);
      codes.push(result.code);
    }

    return c.json({ codes }, 201);
  },
);
