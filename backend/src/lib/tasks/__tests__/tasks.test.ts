import type { Db } from '@backend/db';
import { describe, expect, it, vi } from 'vitest';
import { createTask, getTask } from '../index';

function makeQueue(): Queue {
  return { send: vi.fn().mockResolvedValue(undefined) } as unknown as Queue;
}

function makeDb(
  opts: {
    templateFound?: boolean;
    existingTask?: { id: string; status: string; createdAt: Date } | null;
    insertedTask?: { id: string; status: string; createdAt: Date } | null;
    hasIdempotencyKey?: boolean;
    taskRow?: {
      id: string;
      userId: string | null;
      status: string;
      templateId: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      errorCode: string | null;
    } | null;
    resultRow?: { result: string } | null;
  } = {},
) {
  const {
    templateFound = true,
    existingTask = null,
    insertedTask = { id: 'task-1', status: 'queued', createdAt: new Date('2026-01-01') },
    hasIdempotencyKey = false,
    taskRow = null,
    resultRow = null,
  } = opts;

  let selectCallCount = 0;

  const db = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      const call = selectCallCount;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              if (call === 1) {
                return Promise.resolve(templateFound ? [{ id: 'tpl-1' }] : []);
              }
              if (call === 2) {
                return Promise.resolve(
                  hasIdempotencyKey ? (existingTask ? [existingTask] : []) : insertedTask ? [insertedTask] : [],
                );
              }
              if (call === 3) {
                return Promise.resolve(insertedTask ? [insertedTask] : []);
              }
              if (call === 4) {
                return Promise.resolve(resultRow ? [resultRow] : []);
              }
              return Promise.resolve([]);
            }),
          }),
        }),
      };
    }),
  } as unknown as Db;

  return db;
}

function makeGetDb(
  opts: {
    taskRow?: {
      id: string;
      userId: string | null;
      status: string;
      templateId: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      errorCode: string | null;
    } | null;
    resultRow?: { result: string } | null;
  } = {},
) {
  const { taskRow = null, resultRow = null } = opts;
  let selectCallCount = 0;
  const db = {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      const call = selectCallCount;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              if (call === 1) return Promise.resolve(taskRow ? [taskRow] : []);
              if (call === 2) return Promise.resolve(resultRow ? [resultRow] : []);
              return Promise.resolve([]);
            }),
          }),
        }),
      };
    }),
  } as unknown as Db;
  return db;
}

const BASE_INPUT = {
  userId: 'user-1',
  templateId: 'tpl-1',
  r2Key: 'tmp/invoice_01.jpg',
  disclaimerAccepted: true,
};

describe('createTask', () => {
  it('returns disclaimer_required when disclaimerAccepted is false', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const result = await createTask({ ...BASE_INPUT, disclaimerAccepted: false }, db, queue);
    expect(result).toEqual({ ok: false, error: 'disclaimer_required' });
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('returns r2_key_invalid when r2Key does not start with tmp/', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const result = await createTask({ ...BASE_INPUT, r2Key: 'permanent/file.jpg' }, db, queue);
    expect(result).toEqual({ ok: false, error: 'r2_key_invalid' });
  });

  it('returns r2_key_invalid for empty r2Key', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const result = await createTask({ ...BASE_INPUT, r2Key: '' }, db, queue);
    expect(result).toEqual({ ok: false, error: 'r2_key_invalid' });
  });

  it('returns invalid_template when template not found', async () => {
    const db = makeDb({ templateFound: false });
    const queue = makeQueue();
    const result = await createTask(BASE_INPUT, db, queue);
    expect(result).toEqual({ ok: false, error: 'invalid_template' });
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('creates task and enqueues when inputs are valid', async () => {
    const createdAt = new Date('2026-01-01');
    const db = makeDb({ insertedTask: { id: 'task-abc', status: 'queued', createdAt } });
    const queue = makeQueue();
    const result = await createTask(BASE_INPUT, db, queue);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.status).toBe('queued');
      expect(result.task.id).toBe('task-abc');
    }
    expect(queue.send).toHaveBeenCalledOnce();
  });

  it('returns existing task when idempotency key matches', async () => {
    const existing = { id: 'task-existing', status: 'completed', createdAt: new Date('2025-12-01') };
    const db = makeDb({ existingTask: existing, hasIdempotencyKey: true });
    const queue = makeQueue();
    const result = await createTask({ ...BASE_INPUT, idempotencyKey: 'idem-key-1' }, db, queue);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.id).toBe('task-existing');
      expect(result.task.status).toBe('completed');
    }
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('enqueues new task when idempotency key has no match', async () => {
    const createdAt = new Date('2026-01-02');
    const db = makeDb({
      existingTask: null,
      hasIdempotencyKey: true,
      insertedTask: { id: 'task-new', status: 'queued', createdAt },
    });
    const queue = makeQueue();
    const result = await createTask({ ...BASE_INPUT, idempotencyKey: 'new-key' }, db, queue);
    expect(result.ok).toBe(true);
    expect(queue.send).toHaveBeenCalledOnce();
  });
});

describe('getTask', () => {
  const TASK_ROW = {
    id: 'task-1',
    userId: 'user-1',
    status: 'queued',
    templateId: 'tpl-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    errorCode: null,
  };

  it('returns not_found when task does not exist', async () => {
    const db = makeGetDb({ taskRow: null });
    const result = await getTask('nonexistent', 'user-1', db);
    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns forbidden when task belongs to different user', async () => {
    const db = makeGetDb({ taskRow: TASK_ROW });
    const result = await getTask('task-1', 'user-2', db);
    expect(result).toEqual({ ok: false, error: 'forbidden' });
  });

  it('returns task for its owner', async () => {
    const db = makeGetDb({ taskRow: TASK_ROW });
    const result = await getTask('task-1', 'user-1', db);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.id).toBe('task-1');
      expect(result.task.status).toBe('queued');
      expect(result.task.result).toBeNull();
    }
  });

  it('allows any requestingUserId to read guest task (userId=null)', async () => {
    const guestRow = { ...TASK_ROW, userId: null };
    const db = makeGetDb({ taskRow: guestRow });
    const result = await getTask('task-1', 'some-user', db);
    expect(result.ok).toBe(true);
  });

  it('returns result field when task is completed', async () => {
    const completedRow = { ...TASK_ROW, status: 'completed' };
    const resultData = JSON.stringify({ is_invoice: 'yes' });
    const db = makeGetDb({ taskRow: completedRow, resultRow: { result: resultData } });
    const result = await getTask('task-1', 'user-1', db);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task.result).toBe(resultData);
    }
  });
});
