import type { Bindings } from '@backend/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { admin } from '../admin/index';

vi.mock('@backend/lib/credits', () => ({
  generateRedeemCode: vi.fn().mockImplementation(async (credits: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    let raw = '';
    for (let i = 0; i < 16; i++) {
      raw += chars[bytes[i] % chars.length];
    }

    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    return { code, id: `mock-id-${Date.now()}` };
  }),
}));

let ulidCounter = 0;
vi.mock('ulid', () => ({
  ulid: () => `01ADMIN${String(++ulidCounter).padStart(18, '0')}`,
}));

const originalGetRandomValues = crypto.getRandomValues.bind(crypto);
beforeEach(() => {
  ulidCounter = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: ArrayBufferView) => {
    const uint8 = new Uint8Array((array as Uint8Array).buffer);
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = (i * 13 + 99) % 256;
    }
    return array as Uint8Array;
  });
});

describe('admin routes', () => {
  let mockEnv: Bindings;

  beforeEach(() => {
    ulidCounter = 0;
    mockEnv = {
      ADMIN_SECRET: 'my-secret-token',
      BETTER_AUTH_SECRET: 'auth-secret',
      BETTER_AUTH_URL: 'http://localhost:3000',
      DB: {} as any,
      GEMINI_API_KEY: 'test-key',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      R2_ACCESS_KEY_ID: 'r2-access-key',
      R2_BUCKET: {} as any,
      R2_BUCKET_NAME: 'bucket',
      R2_S3_ENDPOINT: 'https://r2.example.com',
      R2_SECRET_ACCESS_KEY: 'r2-secret-key',
      RATE_LIMIT: {} as any,
      TASK_QUEUE: {} as any,
    };
  });

  describe('POST /codes', () => {
    it('returns 201 with codes array on valid request', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 2, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as { codes: string[] };
      expect(data.codes).toHaveLength(2);
      expect(data.codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('returns 201 with default count=1 when count not specified', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as { codes: string[] };
      expect(data.codes).toHaveLength(1);
    });

    it('returns 201 with count=3 when specified', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 3, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as { codes: string[] };
      expect(data.codes).toHaveLength(3);
    });

    it('returns 403 when x-admin-secret header is missing', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ credits: 10 }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(403);
    });

    it('returns 403 when x-admin-secret header is wrong', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'wrong-secret' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(403);
    });

    it('returns 503 when ADMIN_SECRET env is not set', async () => {
      const envNoSecret = { ...mockEnv, ADMIN_SECRET: undefined } as Partial<Bindings> as Bindings;
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'any-secret' },
          method: 'POST',
        },
        envNoSecret,
      );

      expect(res.status).toBe(503);
    });

    it('returns 400 when body is missing credits field', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 1 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when credits is 0', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 1, credits: 0 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when credits is negative', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 1, credits: -5 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when count is 0', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 0, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when count is negative', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: -1, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when count is 101 (exceeds max of 100)', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 101, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 201 with count=100 (max valid)', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 100, credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as { codes: string[] };
      expect(data.codes).toHaveLength(100);
    });

    it('returns 400 when body is invalid JSON', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: 'not valid json',
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when credits is not a number', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 1, credits: 'ten' }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 when count is not a number', async () => {
      const res = await admin.request(
        '/codes',
        {
          body: JSON.stringify({ count: 'five', credits: 10 }),
          headers: { 'content-type': 'application/json', 'x-admin-secret': 'my-secret-token' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });
  });
});
