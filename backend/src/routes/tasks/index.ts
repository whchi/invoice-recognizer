import { checkAndConsumeEntitlement } from '@backend/lib/quota';
import { createTask, getTask } from '@backend/lib/tasks';
import { authenticateRequest } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describeRoute, resolver } from 'hono-openapi';
import { exportRouter } from './export';
import { TaskResponseSchema, TasksErrorSchema } from './schema';

export const tasks = new Hono<{ Bindings: Bindings; Variables: Variables }>();

tasks.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.message === 'Malformed JSON in request body') {
      return c.json({ error: 'invalid_upload' }, 400);
    }
    return err.getResponse();
  }
  throw err;
});

tasks.post(
  '/',
  describeRoute({
    description: 'Create a new invoice recognition task. Supports Bearer, session, or anonymous auth.',
    responses: {
      201: {
        content: { 'application/json': { schema: resolver(TaskResponseSchema) } },
        description: 'Task created',
      },
      400: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Invalid request',
      },
      401: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Unauthorized — invalid Bearer token',
      },
      409: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Idempotency conflict',
      },
      429: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Rate limit exceeded',
      },
    },
    summary: 'Create task',
    tags: ['Tasks'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    const hasBearer = c.req.header('authorization')?.startsWith('Bearer ');
    if (hasBearer && !authResult) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    const userId = authResult?.userId ?? null;

    const db = c.get('db');
    const entitlement = await checkAndConsumeEntitlement({
      db,
      ip: c.req.header('CF-Connecting-IP') ?? 'unknown',
      kv: c.env.RATE_LIMIT,
      userId,
    });

    if (!entitlement.ok) {
      return c.json({ error: entitlement.error }, 429);
    }

    let body: {
      templateId?: string;
      r2Key?: string;
      disclaimerAccepted?: boolean;
      idempotencyKey?: string;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_upload' }, 400);
    }

    const idempotencyKey = c.req.header('Idempotency-Key') ?? body.idempotencyKey;

    const result = await createTask(
      {
        disclaimerAccepted: body.disclaimerAccepted ?? false,
        idempotencyKey: idempotencyKey ?? undefined,
        r2Key: body.r2Key ?? '',
        templateId: body.templateId ?? '',
        userId,
      },
      db,
      c.env.TASK_QUEUE,
    );

    if (!result.ok) {
      if (result.error === 'idempotency_conflict') {
        return c.json({ error: result.error }, 409);
      }
      return c.json({ error: result.error }, 400);
    }

    return c.json(
      {
        ...result.task,
        createdAt: result.task.createdAt.toISOString(),
      },
      201,
    );
  },
);

tasks.get(
  '/:id',
  describeRoute({
    description: 'Get a task by ID. Returns Retry-After header if task is still processing.',
    responses: {
      200: {
        content: { 'application/json': { schema: resolver(TaskResponseSchema) } },
        description: 'Task details',
      },
      403: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Forbidden',
      },
      404: {
        content: { 'application/json': { schema: resolver(TasksErrorSchema) } },
        description: 'Task not found',
      },
    },
    summary: 'Get task',
    tags: ['Tasks'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    const userId = authResult?.userId ?? null;
    const id = c.req.param('id');
    const db = c.get('db');

    const result = await getTask(id, userId, db);

    if (!result.ok) {
      if (result.error === 'not_found') {
        return c.json({ error: result.error }, 404);
      }
      return c.json({ error: result.error }, 403);
    }

    const headers: Record<string, string> = {};
    if (result.task.status === 'queued' || result.task.status === 'processing') {
      headers['Retry-After'] = '2';
    }

    return c.json(
      {
        ...result.task,
        createdAt: result.task.createdAt?.toISOString() ?? null,
        updatedAt: result.task.updatedAt?.toISOString() ?? null,
      },
      { headers, status: 200 },
    );
  },
);

// Register export routes
tasks.route('/', exportRouter);
