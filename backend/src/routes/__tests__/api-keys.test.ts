import { dbMiddleware } from '@backend/middleware/db';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiKeys } from '../api-keys/index';

// ---------------------------------------------------------------------------
// Auth is handled inline via c.get('user')?.id — no requireAuth middleware mock
// needed. Instead, createTestApp() injects user into context directly.
// ---------------------------------------------------------------------------

let mockAuthUser: { id: string; email?: string; name?: string } | null = null;

// ---------------------------------------------------------------------------
// Mock business logic
// ---------------------------------------------------------------------------

const mockListApiKeys = vi.fn();
const mockCreateApiKey = vi.fn();
const mockRevokeApiKey = vi.fn();
const mockRotateApiKey = vi.fn();

vi.mock('@backend/lib/api-keys', () => ({
  createApiKey: (...args: unknown[]) => mockCreateApiKey(...args),
  listApiKeys: (...args: unknown[]) => mockListApiKeys(...args),
  revokeApiKey: (...args: unknown[]) => mockRevokeApiKey(...args),
  rotateApiKey: (...args: unknown[]) => mockRotateApiKey(...args),
}));

// ---------------------------------------------------------------------------
// Mock DB middleware
// ---------------------------------------------------------------------------

const mockDb = { fake: 'db' };

vi.mock('@backend/middleware/db', () => ({
  dbMiddleware: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('db', mockDb);
    await next();
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestApp() {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', dbMiddleware);
  app.use('*', async (c, next) => {
    if (mockAuthUser) {
      c.set('user', mockAuthUser as Variables['user']);
      c.set('session', { id: 'ses-mock' } as Variables['session']);
    }
    await next();
  });
  app.route('/api/api-keys', apiKeys);
  return app;
}

function setAuthenticated(userId = 'user-1') {
  mockAuthUser = { id: userId };
}

function setUnauthenticated() {
  mockAuthUser = null;
}

type JsonBody = Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  setUnauthenticated();
});

// ---------------------------------------------------------------------------
// GET /api/api-keys
// ---------------------------------------------------------------------------

describe('GET /api/api-keys', () => {
  it('returns 200 with array of keys', async () => {
    setAuthenticated();
    mockListApiKeys.mockResolvedValue([{ id: 'key-1', name: 'Key 1' }]);

    const app = createTestApp();
    const res = await app.request('/api/api-keys', { method: 'GET' });

    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect((body.keys as unknown[]).length).toBe(1);
    expect((body.keys as JsonBody[])[0].id).toBe('key-1');
    expect(mockListApiKeys).toHaveBeenCalledWith(mockDb, 'user-1');
  });

  it('returns 401 when not authenticated', async () => {
    setUnauthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys', { method: 'GET' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/api-keys
// ---------------------------------------------------------------------------

describe('POST /api/api-keys', () => {
  it('returns 201 with created key including raw secret', async () => {
    setAuthenticated();
    mockCreateApiKey.mockResolvedValue({
      fullKey: 'inv_testfullkey123',
      id: 'key-1',
      keyHash: 'hash123',
      name: 'My API Key',
    });

    const app = createTestApp();
    const res = await app.request('/api/api-keys', {
      body: JSON.stringify({ name: 'My API Key' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as JsonBody;
    expect(body.id).toBe('key-1');
    expect(body.fullKey).toBe('inv_testfullkey123');
    expect(body.name).toBe('My API Key');
    expect(mockCreateApiKey).toHaveBeenCalledWith(mockDb, 'user-1', 'My API Key');
  });

  it('returns 400 when name is missing', async () => {
    setAuthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys', {
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as JsonBody;
    expect(body.error).toBe('Name is required');
  });

  it('returns 400 when name is empty string', async () => {
    setAuthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys', {
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as JsonBody;
    expect(body.error).toBe('Name is required');
  });

  it('returns 400 for invalid JSON body', async () => {
    setAuthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys', {
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as JsonBody;
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 401 when not authenticated', async () => {
    setUnauthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys', {
      body: JSON.stringify({ name: 'My API Key' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/api-keys/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/api-keys/:id', () => {
  it('returns 200 on successful delete', async () => {
    setAuthenticated();
    mockRevokeApiKey.mockResolvedValue(true);

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-1', { method: 'DELETE' });

    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.success).toBe(true);
    expect(mockRevokeApiKey).toHaveBeenCalledWith(mockDb, 'key-1', 'user-1');
  });

  it('returns 404 when key not found', async () => {
    setAuthenticated();
    mockRevokeApiKey.mockResolvedValue(false);

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-not-found', { method: 'DELETE' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when key not owned by user (same as not found)', async () => {
    setAuthenticated();
    mockRevokeApiKey.mockResolvedValue(false);

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-1', { method: 'DELETE' });

    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    setUnauthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-1', { method: 'DELETE' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/api-keys/:id/rotate
// ---------------------------------------------------------------------------

describe('POST /api/api-keys/:id/rotate', () => {
  it('returns 200 with new key including raw secret', async () => {
    setAuthenticated();
    mockRotateApiKey.mockResolvedValue({
      fullKey: 'inv_rotatedkey456',
      id: 'key-1',
      name: 'Production',
    });

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-1/rotate', { method: 'POST' });

    expect(res.status).toBe(200);
    const body = (await res.json()) as JsonBody;
    expect(body.id).toBe('key-1');
    expect(body.fullKey).toBe('inv_rotatedkey456');
    expect(body.name).toBe('Production');
    expect(mockRotateApiKey).toHaveBeenCalledWith(mockDb, 'key-1', 'user-1');
  });

  it('returns 404 when key not found', async () => {
    setAuthenticated();
    mockRotateApiKey.mockResolvedValue(null);

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-not-found/rotate', { method: 'POST' });

    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    setUnauthenticated();

    const app = createTestApp();
    const res = await app.request('/api/api-keys/key-1/rotate', { method: 'POST' });

    expect(res.status).toBe(401);
  });
});
