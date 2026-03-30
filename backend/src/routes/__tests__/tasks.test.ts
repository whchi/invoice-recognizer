import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@backend/middleware/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@backend/lib/quota', () => ({
  checkAndConsumeEntitlement: vi.fn(),
}));

vi.mock('@backend/lib/tasks', () => ({
  createTask: vi.fn(),
  getTask: vi.fn(),
}));

import { checkAndConsumeEntitlement } from '@backend/lib/quota';
import { createTask, getTask } from '@backend/lib/tasks';
import { authenticateRequest } from '@backend/middleware/auth';

const mockAuthenticateRequest = authenticateRequest as ReturnType<typeof vi.fn>;
const mockCheckEntitlement = checkAndConsumeEntitlement as ReturnType<typeof vi.fn>;
const mockCreateTask = createTask as ReturnType<typeof vi.fn>;
const mockGetTask = getTask as ReturnType<typeof vi.fn>;

const mockEnv = {
  DB: {} as D1Database,
  RATE_LIMIT: {} as KVNamespace,
  TASK_QUEUE: { send: vi.fn() } as unknown as Queue,
} as unknown as Bindings;

async function importTasks() {
  const mod = await import('@backend/routes/tasks/index');
  return mod.tasks;
}

function createTestApp(tasksRoute: Hono<{ Bindings: Bindings; Variables: Variables }>) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.route('/api/tasks', tasksRoute);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/tasks', () => {
  it('returns 201 with task object on happy path (Bearer auth)', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    const createdAt = new Date('2026-01-01');
    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({
      ok: true,
      task: { createdAt, id: 'task-abc', status: 'queued' },
    });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe('task-abc');
    expect(body.status).toBe('queued');
  });

  it('returns 201 for guest (no auth header) with userId=null', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    const createdAt = new Date('2026-01-01');
    mockAuthenticateRequest.mockResolvedValue(null);
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'guest_daily' });
    mockCreateTask.mockResolvedValue({
      ok: true,
      task: { createdAt, id: 'task-guest', status: 'queued' },
    });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe('task-guest');

    expect(mockCreateTask.mock.calls[0][0]).toEqual(expect.objectContaining({ userId: null }));
  });

  it('returns 429 when rate limit exceeded', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue(null);
    mockCheckEntitlement.mockResolvedValue({ error: 'quota_exceeded', ok: false });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('quota_exceeded');
  });

  it('returns 400 when disclaimer not accepted', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({ error: 'disclaimer_required', ok: false });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: false,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('disclaimer_required');
  });

  it('returns 400 for invalid template', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({ error: 'invalid_template', ok: false });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'nonexistent',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_template');
  });

  it('returns 400 for invalid body (parse error)', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });

    const res = await app.request(
      '/api/tasks',
      {
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_upload');
  });

  it('uses Idempotency-Key header, returns 201 for existing task', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    const createdAt = new Date('2026-01-01');
    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({
      ok: true,
      task: { createdAt, id: 'task-existing', status: 'completed' },
    });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idem-123',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe('task-existing');

    expect(mockCreateTask.mock.calls[0][0]).toEqual(expect.objectContaining({ idempotencyKey: 'idem-123' }));
  });

  it('header Idempotency-Key takes precedence over body idempotencyKey', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    const createdAt = new Date('2026-01-01');
    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({
      ok: true,
      task: { createdAt, id: 'task-1', status: 'queued' },
    });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          idempotencyKey: 'body-key',
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'header-key',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(201);

    expect(mockCreateTask.mock.calls[0][0]).toEqual(expect.objectContaining({ idempotencyKey: 'header-key' }));
  });

  it('uses body idempotencyKey when header not present', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    const createdAt = new Date('2026-01-01');
    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockCheckEntitlement.mockResolvedValue({ ok: true, source: 'member_daily' });
    mockCreateTask.mockResolvedValue({
      ok: true,
      task: { createdAt, id: 'task-1', status: 'queued' },
    });

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          idempotencyKey: 'body-key',
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer valid-key',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
    expect(mockCreateTask.mock.calls[0][0]).toEqual(expect.objectContaining({ idempotencyKey: 'body-key' }));
  });

  it('returns 401 for invalid Bearer token (fail-fast)', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue(null);

    const res = await app.request(
      '/api/tasks',
      {
        body: JSON.stringify({
          disclaimerAccepted: true,
          r2Key: 'tmp/invoice.jpg',
          templateId: 'tpl-1',
        }),
        headers: {
          Authorization: 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeDefined();

    expect(mockCheckEntitlement).not.toHaveBeenCalled();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns 200 with task on happy path (authenticated)', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        createdAt: new Date('2026-01-01'),
        errorCode: null,
        id: 'task-1',
        result: null,
        status: 'queued',
        templateId: 'tpl-1',
        updatedAt: new Date('2026-01-01'),
      },
    });

    const res = await app.request('/api/tasks/task-1', { method: 'GET' }, mockEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe('task-1');
    expect(body.status).toBe('queued');
  });

  it('returns 404 when task not found', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-1' });
    mockGetTask.mockResolvedValue({ error: 'not_found', ok: false });

    const res = await app.request('/api/tasks/nonexistent', { method: 'GET' }, mockEnv);

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('not_found');
  });

  it('returns 200 for guest access (no auth, userId=null)', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue(null);
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        createdAt: new Date('2026-01-01'),
        errorCode: null,
        id: 'task-guest',
        result: '{"is_invoice":"yes"}',
        status: 'completed',
        templateId: 'tpl-1',
        updatedAt: new Date('2026-01-01'),
      },
    });

    const res = await app.request('/api/tasks/task-guest', { method: 'GET' }, mockEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe('task-guest');

    expect(mockGetTask).toHaveBeenCalledWith('task-guest', null, undefined);
  });
});

describe('GET /api/tasks/:id/export', () => {
  it('returns 400 for task not completed', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: 'task-123',
        status: 'processing',
        createdAt: new Date(),
      },
    });

    const res = await app.request('/api/tasks/task-123/export?format=json', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('task_not_completed');
  });

  it('returns 400 for invalid format', async () => {
    const tasksRoute = await importTasks();
    const app = createTestApp(tasksRoute);

    mockAuthenticateRequest.mockResolvedValue({ userId: 'user-123' });
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: 'task-123',
        status: 'completed',
        result: '{"invoice_number":"AB-12345678"}',
        createdAt: new Date(),
      },
    });

    const res = await app.request('/api/tasks/task-123/export?format=yaml', { method: 'GET' }, mockEnv);
    expect(res.status).toBe(400);
  });
});
