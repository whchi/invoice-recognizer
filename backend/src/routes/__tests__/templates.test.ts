import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListTemplates = vi.fn();
const mockCreateTemplate = vi.fn();
const mockGetTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockToggleFavorite = vi.fn();
const mockSetDefaultTemplate = vi.fn();

vi.mock('@backend/lib/templates', () => ({
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args),
  getTemplate: (...args: unknown[]) => mockGetTemplate(...args),
  listTemplates: (...args: unknown[]) => mockListTemplates(...args),
  setDefaultTemplate: (...args: unknown[]) => mockSetDefaultTemplate(...args),
  toggleFavorite: (...args: unknown[]) => mockToggleFavorite(...args),
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
}));

let authenticated = true;
vi.mock('@backend/middleware/auth', () => ({
  requireAuth: async (c: unknown, next: () => Promise<void>) => {
    if (!authenticated) {
      const ctx = c as { json: (body: unknown, status: number) => Response };
      return ctx.json({ error: 'Unauthorized' }, 401);
    }
    const ctx = c as { set: (key: string, value: unknown) => void };
    ctx.set('user', { email: 'test@example.com', id: 'user-123', name: 'Test' });
    ctx.set('session', { id: 'ses-1' });
    await next();
  },
}));

import { templates } from '@backend/routes/templates/index';

function createApp() {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  const mockDb = { mock: true };
  app.use('*', async (c, next) => {
    c.set('db', mockDb as unknown as Variables['db']);
    await next();
  });
  app.route('/api/templates', templates);
  return app;
}

const mockEnv = {} as Bindings;

type JsonBody = Record<string, unknown>;

describe('templates routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true;
    app = createApp();
  });

  describe('GET /api/templates', () => {
    it('returns list of templates (200)', async () => {
      mockListTemplates.mockResolvedValue([
        { createdBy: null, fields: '["amount","currency"]', id: 't1', isSystem: 1, name: 'Invoice' },
        { createdBy: 'user-123', fields: '["vendor"]', id: 't2', isSystem: 0, name: 'Receipt' },
      ]);

      const res = await app.request('/api/templates', { method: 'GET' }, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      const tpls = body.templates as JsonBody[];
      expect(tpls).toHaveLength(2);
      expect(tpls[0].fields).toEqual(['amount', 'currency']);
      expect(tpls[1].fields).toEqual(['vendor']);
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request('/api/templates', { method: 'GET' }, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/templates', () => {
    it('creates a template (201)', async () => {
      mockCreateTemplate.mockResolvedValue({ id: 'new-id', ok: true });

      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: ['amount', 'currency'], name: 'My Template' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as JsonBody;
      expect(body.id).toBe('new-id');
      expect(mockCreateTemplate).toHaveBeenCalledWith(expect.anything(), {
        createdBy: 'user-123',
        fields: ['amount', 'currency'],
        name: 'My Template',
      });
    });

    it('returns 400 when name is missing', async () => {
      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: ['amount'] }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 400 when name is empty string', async () => {
      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: ['amount'], name: '  ' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 400 when fields is not an array', async () => {
      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: 'not-array', name: 'Test' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 400 when createTemplate returns validation errors', async () => {
      mockCreateTemplate.mockResolvedValue({
        errors: ['invalid field name: "1bad"'],
        ok: false,
      });

      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: ['1bad'], name: 'Test' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
      expect(body.message).toContain('invalid field name');
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await app.request(
        '/api/templates',
        {
          body: 'not-json{',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('invalid_body');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request(
        '/api/templates',
        {
          body: JSON.stringify({ fields: ['amount'], name: 'Test' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
        mockEnv,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/templates/:id', () => {
    it('returns the template (200)', async () => {
      mockGetTemplate.mockResolvedValue({
        createdBy: null,
        fields: '["amount","currency"]',
        id: 't1',
        isSystem: 1,
        name: 'Invoice',
      });

      const res = await app.request('/api/templates/t1', { method: 'GET' }, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      expect(body.id).toBe('t1');
      expect(body.fields).toEqual(['amount', 'currency']);
    });

    it('returns 404 when template not found', async () => {
      mockGetTemplate.mockResolvedValue(null);

      const res = await app.request('/api/templates/nonexistent', { method: 'GET' }, mockEnv);

      expect(res.status).toBe(404);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('not_found');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request('/api/templates/t1', { method: 'GET' }, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/templates/:id', () => {
    it('updates a template (200)', async () => {
      mockUpdateTemplate.mockResolvedValue({ ok: true });

      const res = await app.request(
        '/api/templates/t1',
        {
          body: JSON.stringify({ fields: ['vendor'], name: 'Updated' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        },
        mockEnv,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      expect(body.ok).toBe(true);
      expect(mockUpdateTemplate).toHaveBeenCalledWith(expect.anything(), 't1', { fields: ['vendor'], name: 'Updated' });
    });

    it('returns 400 for validation errors', async () => {
      mockUpdateTemplate.mockResolvedValue({
        errors: ['cannot modify system templates'],
        ok: false,
      });

      const res = await app.request(
        '/api/templates/t1',
        {
          body: JSON.stringify({ name: 'Updated' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 404 when template not found', async () => {
      mockUpdateTemplate.mockResolvedValue({
        errors: ['template not found'],
        ok: false,
      });

      const res = await app.request(
        '/api/templates/nonexistent',
        {
          body: JSON.stringify({ name: 'Updated' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        },
        mockEnv,
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await app.request(
        '/api/templates/t1',
        {
          body: 'bad-json',
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('invalid_body');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request(
        '/api/templates/t1',
        {
          body: JSON.stringify({ name: 'Updated' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
        },
        mockEnv,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('deletes a template (200)', async () => {
      mockDeleteTemplate.mockResolvedValue({ ok: true });

      const res = await app.request('/api/templates/t1', { method: 'DELETE' }, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      expect(body.ok).toBe(true);
    });

    it('returns 404 when template not found', async () => {
      mockDeleteTemplate.mockResolvedValue({
        errors: ['template not found'],
        ok: false,
      });

      const res = await app.request('/api/templates/nonexistent', { method: 'DELETE' }, mockEnv);

      expect(res.status).toBe(404);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 400 for system template', async () => {
      mockDeleteTemplate.mockResolvedValue({
        errors: ['cannot delete system templates'],
        ok: false,
      });

      const res = await app.request('/api/templates/sys1', { method: 'DELETE' }, mockEnv);

      expect(res.status).toBe(400);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request('/api/templates/t1', { method: 'DELETE' }, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/templates/:id/favorite', () => {
    it('toggles favorite (200)', async () => {
      mockToggleFavorite.mockResolvedValue({ favorited: true, ok: true });

      const res = await app.request('/api/templates/t1/favorite', { method: 'POST' }, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      expect(body.ok).toBe(true);
      expect(body.favorited).toBe(true);
      expect(mockToggleFavorite).toHaveBeenCalledWith(expect.anything(), 'user-123', 't1');
    });

    it('returns 404 when template not found', async () => {
      mockToggleFavorite.mockResolvedValue({
        errors: ['template not found'],
        ok: false,
      });

      const res = await app.request('/api/templates/nonexistent/favorite', { method: 'POST' }, mockEnv);

      expect(res.status).toBe(404);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request('/api/templates/t1/favorite', { method: 'POST' }, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/templates/:id/default', () => {
    it('sets default template (200)', async () => {
      mockSetDefaultTemplate.mockResolvedValue({ ok: true });

      const res = await app.request('/api/templates/t1/default', { method: 'POST' }, mockEnv);

      expect(res.status).toBe(200);
      const body = (await res.json()) as JsonBody;
      expect(body.ok).toBe(true);
      expect(mockSetDefaultTemplate).toHaveBeenCalledWith(expect.anything(), 'user-123', 't1');
    });

    it('returns 404 when template not found', async () => {
      mockSetDefaultTemplate.mockResolvedValue({
        errors: ['template not found'],
        ok: false,
      });

      const res = await app.request('/api/templates/nonexistent/default', { method: 'POST' }, mockEnv);

      expect(res.status).toBe(404);
      const body = (await res.json()) as JsonBody;
      expect(body.error).toBe('validation');
    });

    it('returns 401 when not authenticated', async () => {
      authenticated = false;
      const res = await app.request('/api/templates/t1/default', { method: 'POST' }, mockEnv);
      expect(res.status).toBe(401);
    });
  });
});
