import type { Db } from '@backend/db';
import { describe, expect, it, vi } from 'vitest';
import { checkAndConsumeEntitlement } from '../index';

function createMockKv(getReturn: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(getReturn),
    put: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;
}

function createMockDb(opts: { batchSecondRowsAffected?: number; walletRowsAffected?: number }) {
  const mockInsertChain = {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue('insert-stmt'),
    }),
  };

  const mockUpdateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue('update-stmt'),
    }),
  };

  let updateCallCount = 0;

  const db = {
    insert: vi.fn().mockReturnValue(mockInsertChain),
    update: vi.fn().mockImplementation(() => {
      updateCallCount++;
      if (updateCallCount === 1) {
        return mockUpdateChain;
      }
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({
            rowsAffected: opts.walletRowsAffected ?? 0,
          }),
        }),
      };
    }),
    batch: vi.fn().mockResolvedValue([{}, { rowsAffected: opts.batchSecondRowsAffected ?? 0 }]),
  } as unknown as Db;

  return db;
}

describe('checkAndConsumeEntitlement', () => {
  const TODAY = '2026-02-22';

  describe('guest path', () => {
    it('allows guest under daily limit', async () => {
      const kv = createMockKv(null);
      const db = createMockDb({});

      const result = await checkAndConsumeEntitlement({
        userId: null,
        ip: '192.168.1.1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: true, source: 'guest_daily' });
      expect(kv.get).toHaveBeenCalledOnce();
      expect(kv.put).toHaveBeenCalledWith(expect.stringContaining(`:${TODAY}`), '1', { expirationTtl: 86400 });
    });

    it('rejects guest at daily limit (count=3)', async () => {
      const kv = createMockKv('3');
      const db = createMockDb({});

      const result = await checkAndConsumeEntitlement({
        userId: null,
        ip: '192.168.1.1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: false, error: 'quota_exceeded' });
      expect(kv.put).not.toHaveBeenCalled();
    });

    it('rejects guest over daily limit (count=5)', async () => {
      const kv = createMockKv('5');
      const db = createMockDb({});

      const result = await checkAndConsumeEntitlement({
        userId: null,
        ip: '10.0.0.1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: false, error: 'quota_exceeded' });
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  describe('member path', () => {
    it('succeeds via daily quota', async () => {
      const kv = createMockKv();
      const db = createMockDb({ batchSecondRowsAffected: 1 });

      const result = await checkAndConsumeEntitlement({
        userId: 'user-1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: true, source: 'member_daily' });
      expect(db.batch).toHaveBeenCalledOnce();
    });

    it('falls back to pack credits when daily exhausted', async () => {
      const kv = createMockKv();
      const db = createMockDb({
        batchSecondRowsAffected: 0,
        walletRowsAffected: 1,
      });

      const result = await checkAndConsumeEntitlement({
        userId: 'user-1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: true, source: 'member_pack' });
    });

    it('returns insufficient_credits when both exhausted', async () => {
      const kv = createMockKv();
      const db = createMockDb({
        batchSecondRowsAffected: 0,
        walletRowsAffected: 0,
      });

      const result = await checkAndConsumeEntitlement({
        userId: 'user-1',
        db,
        kv,
        today: TODAY,
      });

      expect(result).toEqual({ ok: false, error: 'insufficient_credits' });
    });
  });
});
