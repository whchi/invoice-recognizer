import { getWallet, redeemCode } from '@backend/lib/credits';
import { authenticateRequest } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import { CreditsErrorSchema, RedeemResponseSchema, WalletResponseSchema } from './schema';

export const credits = new Hono<{ Bindings: Bindings; Variables: Variables }>();

credits.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.message === 'Malformed JSON in request body') {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    return err.getResponse();
  }
  throw err;
});

credits.get(
  '/wallet',
  describeRoute({
    description: "Get the authenticated user's wallet information including balance and usage.",
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(WalletResponseSchema) } },
        description: 'Wallet information',
      },
      401: {
        content: { 'application/json': { schema: resolver(CreditsErrorSchema) } },
        description: 'Unauthorized',
      },
    },
    summary: 'Get wallet',
    tags: ['Credits'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    if (!authResult) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = c.get('db');
    const wallet = await getWallet(authResult.userId, db);

    return c.json(wallet, 200);
  },
);

credits.post(
  '/redeem',
  describeRoute({
    description: "Redeem a code to add credits to the authenticated user's wallet.",
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(RedeemResponseSchema) } },
        description: 'Code redeemed successfully',
      },
      400: {
        content: { 'application/json': { schema: resolver(CreditsErrorSchema) } },
        description: 'Invalid request',
      },
      401: {
        content: { 'application/json': { schema: resolver(CreditsErrorSchema) } },
        description: 'Unauthorized',
      },
      404: {
        content: { 'application/json': { schema: resolver(CreditsErrorSchema) } },
        description: 'Code not found',
      },
      409: {
        content: { 'application/json': { schema: resolver(CreditsErrorSchema) } },
        description: 'Code already redeemed',
      },
    },
    summary: 'Redeem code',
    tags: ['Credits'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    if (!authResult) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let body: { code?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const code = body.code?.trim();
    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
      return c.json({ error: 'Invalid code format' }, 400);
    }

    const db = c.get('db');
    const result = await redeemCode(code.toUpperCase(), authResult.userId, db);

    if (!result.ok) {
      if (result.error === 'code_not_found') {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ error: result.error }, 409);
    }
    return c.json(
      {
        credits: result.credits,
        newBalance: result.newBalance,
      },
      200,
    );
  },
);
