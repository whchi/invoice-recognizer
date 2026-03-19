import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@backend/middleware/auth', () => ({
  authenticateRequest: vi.fn(),
}));
vi.mock('@backend/lib/credits', () => ({
  getWallet: vi.fn(),
  redeemCode: vi.fn(),
}));

import { getWallet, redeemCode } from '@backend/lib/credits';
import { authenticateRequest } from '@backend/middleware/auth';

const mockAuthenticateRequest = authenticateRequest as ReturnType<typeof vi.fn>;
const mockGetWallet = getWallet as ReturnType<typeof vi.fn>;
const mockRedeemCode = redeemCode as ReturnType<typeof vi.fn>;

const mockEnv = {} as Bindings;

async function importCredits() {
  const mod = await import('@backend/routes/credits/index');
  return mod.credits;
}

function createTestApp(creditsRoute: Hono<{ Bindings: Bindings; Variables: Variables }>) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  const mockDb = { mock: true };
  app.use('*', async (c, next) => {
    c.set('db', mockDb as unknown as Variables['db']);
    await next();
  });
  app.route('/api/credits', creditsRoute);
  return { app, mockDb };
}
function jsonReq(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe('GET /api/credits/wallet', () => {
  it('returns 200 with wallet info when authenticated via Bearer', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockGetWallet.mockResolvedValue({
      balance: 500,
      dailyUsed: 3,
      dailyDate: '2026-02-24',
      dailyRemaining: 17,
    });

    const res = await app.request(
      '/api/credits/wallet',
      { method: 'GET', headers: { Authorization: 'Bearer inv_test-key' } },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      balance: 500,
      dailyUsed: 3,
      dailyDate: '2026-02-24',
      dailyRemaining: 17,
    });
    expect(mockAuthenticateRequest).toHaveBeenCalledOnce();
    expect(mockGetWallet).toHaveBeenCalledWith('user-123', expect.anything());
  });
  it('returns 200 with wallet info when authenticated via session', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'session-user-456' });
    mockGetWallet.mockResolvedValue({
      balance: 0,
      dailyUsed: 0,
      dailyDate: '2026-02-24',
      dailyRemaining: 20,
    });

    const res = await app.request('/api/credits/wallet', { method: 'GET' }, mockEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.balance).toBe(0);
    expect(body.dailyRemaining).toBe(20);
  });

  it('returns 401 when not authenticated', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue(null);

    const res = await app.request('/api/credits/wallet', { method: 'GET' }, mockEnv);

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Unauthorized');
  });
  it('returns 401 when Bearer token is invalid (fail-fast, no session fallback)', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue(null);

    const res = await app.request(
      '/api/credits/wallet',
      { method: 'GET', headers: { Authorization: 'Bearer invalid-token' } },
      mockEnv,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Unauthorized');
  });
});
describe('POST /api/credits/redeem', () => {
  it('returns 200 with redemption result on valid code', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockRedeemCode.mockResolvedValue({
      ok: true,
      credits: 100,
      newBalance: 600,
    });

    const res = await app.request(
      jsonReq('/api/credits/redeem', { code: 'ABCD-EFGH-IJKL-MNOP' }, { Authorization: 'Bearer inv_test' }),
      undefined,
      mockEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ credits: 100, newBalance: 600 });
    expect(mockRedeemCode).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP', 'user-123', expect.anything());
  });
  it('returns 400 for invalid code format', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });

    const res = await app.request(jsonReq('/api/credits/redeem', { code: 'not-a-valid-code' }), undefined, mockEnv);

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Invalid code format');
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });
  it('returns 409 for already redeemed code', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockRedeemCode.mockResolvedValue({
      ok: false,
      error: 'already_redeemed',
    });

    const res = await app.request(jsonReq('/api/credits/redeem', { code: 'ABCD-EFGH-IJKL-MNOP' }), undefined, mockEnv);

    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('already_redeemed');
  });

  it('returns 401 when not authenticated', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue(null);

    const res = await app.request(jsonReq('/api/credits/redeem', { code: 'ABCD-EFGH-IJKL-MNOP' }), undefined, mockEnv);

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Unauthorized');
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });
  it('returns 400 when code is missing from body', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });

    const res = await app.request(jsonReq('/api/credits/redeem', {}), undefined, mockEnv);

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Code is required');
  });
  it('returns 404 for code_not_found error', async () => {
    const creditsRoute = await importCredits();
    const { app } = createTestApp(creditsRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockRedeemCode.mockResolvedValue({
      ok: false,
      error: 'code_not_found',
    });

    const res = await app.request(jsonReq('/api/credits/redeem', { code: 'ABCD-EFGH-IJKL-MNOP' }), undefined, mockEnv);

    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('code_not_found');
  });
});
