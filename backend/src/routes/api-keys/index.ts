import { createApiKey, listApiKeys, revokeApiKey, rotateApiKey } from '@backend/lib/api-keys';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import {
  ApiKeyListResponseSchema,
  ApiKeysErrorSchema,
  CreateApiKeyResponseSchema,
  RotateKeyResponseSchema,
  SuccessResponseSchema,
} from './schema';

export const apiKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

apiKeys.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.message === 'Malformed JSON in request body') {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    return err.getResponse();
  }
  throw err;
});

apiKeys.get(
  '/',
  describeRoute({
    description: 'List all API keys for the authenticated user.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(ApiKeyListResponseSchema) } },
        description: 'List of API keys',
      },
      401: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'Unauthorized',
      },
    },
    summary: 'List API keys',
    tags: ['API Keys'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const db = c.get('db');
    const keys = await listApiKeys(db, userId);
    return c.json(
      {
        keys: keys.map(k => ({
          ...k,
          createdAt: k.createdAt?.toISOString() ?? null,
          revokedAt: k.revokedAt?.toISOString() ?? null,
        })),
      },
      200,
    );
  },
);

apiKeys.post(
  '/',
  describeRoute({
    description: 'Create a new API key for the authenticated user.',
    responses: {
      201: {
        content: { 'application/json': { schema: resolver(CreateApiKeyResponseSchema) } },
        description: 'API key created',
      },
      400: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'Invalid request',
      },
      401: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'Unauthorized',
      },
    },
    summary: 'Create API key',
    tags: ['API Keys'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    let body: { name?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const name = body.name?.trim();
    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const db = c.get('db');
    const result = await createApiKey(db, userId, name);
    return c.json(
      {
        ...result,
        createdAt: result.createdAt?.toISOString() ?? null,
      },
      201,
    );
  },
);

apiKeys.delete(
  '/:id',
  describeRoute({
    description: 'Revoke an API key by ID.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(SuccessResponseSchema) } },
        description: 'API key revoked',
      },
      401: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'Unauthorized',
      },
      404: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'API key not found or already revoked',
      },
    },
    summary: 'Revoke API key',
    tags: ['API Keys'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const db = c.get('db');
    const revoked = await revokeApiKey(db, id, userId);

    if (!revoked) {
      return c.json({ error: 'API key not found or already revoked' }, 404);
    }

    return c.json({ success: true }, 200);
  },
);

apiKeys.post(
  '/:id/rotate',
  describeRoute({
    description: 'Rotate an API key, generating a new key value while keeping the same ID.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(RotateKeyResponseSchema) } },
        description: 'API key rotated',
      },
      401: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'Unauthorized',
      },
      404: {
        content: { 'application/json': { schema: resolver(ApiKeysErrorSchema) } },
        description: 'API key not found or already revoked',
      },
    },
    summary: 'Rotate API key',
    tags: ['API Keys'],
  }),
  async c => {
    const userId = c.get('user')?.id;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const db = c.get('db');
    const result = await rotateApiKey(db, id, userId);
    if (!result) {
      return c.json({ error: 'API key not found or already revoked' }, 404);
    }

    return c.json(
      {
        ...result,
        createdAt: result.createdAt?.toISOString() ?? null,
      },
      200,
    );
  },
);
