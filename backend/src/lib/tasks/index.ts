import type { Db } from '@backend/db';
import { taskResults, tasks, templates } from '@backend/db/schema';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type CreateTaskInput = {
  userId: string | null;
  templateId: string;
  r2Key: string;
  disclaimerAccepted: boolean;
  idempotencyKey?: string;
};

export type CreateTaskResult =
  | { ok: true; task: { id: string; status: string; createdAt: Date } }
  | {
      ok: false;
      error: 'invalid_template' | 'disclaimer_required' | 'r2_key_invalid' | 'idempotency_conflict';
    };

export type GetTaskResult =
  | {
      ok: true;
      task: {
        id: string;
        status: TaskStatus;
        templateId: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        errorCode: string | null;
        result: string | null;
      };
    }
  | { ok: false; error: 'not_found' | 'forbidden' };

export async function createTask(input: CreateTaskInput, db: Db, queue: Queue): Promise<CreateTaskResult> {
  if (!input.disclaimerAccepted) {
    return { ok: false, error: 'disclaimer_required' };
  }

  if (!input.r2Key || !input.r2Key.startsWith('tmp/')) {
    return { ok: false, error: 'r2_key_invalid' };
  }

  const [template] = await db
    .select({ id: templates.id })
    .from(templates)
    .where(eq(templates.id, input.templateId))
    .limit(1);

  if (!template) {
    return { ok: false, error: 'invalid_template' };
  }

  if (input.idempotencyKey) {
    const whereClause =
      input.userId !== null
        ? and(eq(tasks.idempotencyKey, input.idempotencyKey), eq(tasks.userId, input.userId))
        : eq(tasks.idempotencyKey, input.idempotencyKey);

    const [existing] = await db
      .select({ id: tasks.id, status: tasks.status, createdAt: tasks.createdAt })
      .from(tasks)
      .where(whereClause)
      .limit(1);

    if (existing) {
      return {
        ok: true,
        task: {
          id: existing.id,
          status: existing.status,
          createdAt: existing.createdAt ?? new Date(),
        },
      };
    }
  }

  const taskId = ulid();
  await db.insert(tasks).values({
    id: taskId,
    userId: input.userId,
    r2Key: input.r2Key,
    templateId: input.templateId,
    status: 'queued',
    idempotencyKey: input.idempotencyKey ?? null,
  });

  await queue.send({ taskId });

  const [inserted] = await db
    .select({ id: tasks.id, status: tasks.status, createdAt: tasks.createdAt })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return {
    ok: true,
    task: {
      id: inserted.id,
      status: inserted.status,
      createdAt: inserted.createdAt ?? new Date(),
    },
  };
}

export async function getTask(id: string, requestingUserId: string | null, db: Db): Promise<GetTaskResult> {
  const [row] = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      status: tasks.status,
      templateId: tasks.templateId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      errorCode: tasks.errorCode,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!row) {
    return { ok: false, error: 'not_found' };
  }

  // Authorization: task owner or guest (userId null means guest task — no owner check)
  if (row.userId !== null && row.userId !== requestingUserId) {
    return { ok: false, error: 'forbidden' };
  }

  let result: string | null = null;
  if (row.status === 'completed') {
    const [resultRow] = await db
      .select({ result: taskResults.result })
      .from(taskResults)
      .where(eq(taskResults.taskId, id))
      .limit(1);
    result = resultRow?.result ?? null;
  }

  return {
    ok: true,
    task: {
      id: row.id,
      status: row.status as TaskStatus,
      templateId: row.templateId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      errorCode: row.errorCode,
      result,
    },
  };
}
