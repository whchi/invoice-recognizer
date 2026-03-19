import type { Db } from '@backend/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiKey, hashKey, listApiKeys, revokeApiKey, rotateApiKey } from '../index';

let ulidCounter = 0;
vi.mock('ulid', () => ({
  ulid: () => `01TESTAPIKEY${String(++ulidCounter).padStart(14, '0')}`,
}));

beforeEach(() => {
  ulidCounter = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: ArrayBufferView) => {
    const uint8 = new Uint8Array((array as Uint8Array).buffer);
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = (ulidCounter * 17 + i * 13 + 7) % 256;
    }
    return array as Uint8Array;
  });
});

function createMockDb() {
  const mockInsert = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));

  const mockSelectResult: unknown[] = [];

  const mockSelect = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => {
        const whereResult = {
          limit: vi.fn().mockResolvedValue(mockSelectResult),
        };
        return Object.assign(Promise.resolve(mockSelectResult), whereResult);
      }),
    })),
  }));

  const mockUpdate = vi.fn().mockImplementation(() => ({
    set: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    })),
  }));

  const mockBatch = vi.fn().mockImplementation(async (ops: Promise<unknown>[]) => {
    return Promise.all(ops);
  });

  return {
    db: {
      batch: mockBatch,
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
    } as unknown as Db,
    mockBatch,
    mockInsert,
    mockSelect,
    mockSelectResult,
    mockUpdate,
  };
}

describe('hashKey', () => {
  it('returns a 64-char lowercase hex string', async () => {
    const hash = await hashKey('inv_dGVzdGtleQ==');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent hashes for same input', async () => {
    const key = 'inv_dGVzdGtleQ==';
    const h1 = await hashKey(key);
    const h2 = await hashKey(key);
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', async () => {
    const h1 = await hashKey('inv_key1');
    const h2 = await hashKey('inv_key2');
    expect(h1).not.toBe(h2);
  });
});

describe('createApiKey', () => {
  it('inserts row with correct fields and returns result', async () => {
    const { db, mockInsert } = createMockDb();
    const result = await createApiKey(db, 'user-123', 'My API Key');

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      createdAt: expect.any(Date),
      fullKey: expect.stringMatching(/^inv_/),
      id: expect.any(String),
      name: 'My API Key',
      prefix: expect.stringMatching(/^inv_/),
    });
    expect(result.prefix).toBe(result.fullKey.slice(0, 8));
  });

  it('generates a key with inv_ prefix', async () => {
    const { db } = createMockDb();
    const result = await createApiKey(db, 'user-456', 'test key');

    expect(result.fullKey).toMatch(/^inv_/);
    expect(result.prefix).toMatch(/^inv_/);
  });

  it('stores id as ULID', async () => {
    const { db } = createMockDb();
    const result = await createApiKey(db, 'user-789', 'test');

    expect(result.id).toMatch(/^01TESTAPIKEY/);
  });

  it('returns different keys for consecutive calls', async () => {
    const { db } = createMockDb();
    const result1 = await createApiKey(db, 'user-1', 'key1');
    const result2 = await createApiKey(db, 'user-1', 'key2');

    expect(result1.fullKey).not.toBe(result2.fullKey);
    expect(result1.id).not.toBe(result2.id);
  });
});

describe('listApiKeys', () => {
  it('returns empty array when user has no keys', async () => {
    const { db, mockSelectResult } = createMockDb();
    mockSelectResult.length = 0;

    const result = await listApiKeys(db, 'user-new');

    expect(result).toEqual([]);
  });

  it('returns all keys for a user', async () => {
    const keys = [
      { createdAt: new Date(), id: 'key-1', name: 'Prod Key', prefix: 'inv_abc1', revokedAt: null },
      { createdAt: new Date(), id: 'key-2', name: 'Dev Key', prefix: 'inv_def2', revokedAt: new Date() },
    ];
    const { db, mockSelectResult } = createMockDb();
    mockSelectResult.push(...keys);

    const result = await listApiKeys(db, 'user-123');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(keys[0]);
    expect(result[1]).toEqual(keys[1]);
  });

  it('includes both active and revoked keys', async () => {
    const keys = [
      { createdAt: new Date(), id: 'key-1', name: 'Active', prefix: 'inv_111', revokedAt: null },
      {
        createdAt: new Date('2026-02-01'),
        id: 'key-2',
        name: 'Revoked',
        prefix: 'inv_222',
        revokedAt: new Date('2026-02-01'),
      },
    ];
    const { db, mockSelectResult } = createMockDb();
    mockSelectResult.push(...keys);

    const result = await listApiKeys(db, 'user-456');

    expect(result).toHaveLength(2);
    expect(result.filter(k => k.revokedAt === null)).toHaveLength(1);
    expect(result.filter(k => k.revokedAt !== null)).toHaveLength(1);
  });

  it('returns keys in order they appear in db', async () => {
    const keys = [
      { createdAt: new Date('2026-01-01'), id: 'key-a', name: 'First', prefix: 'inv_aaa', revokedAt: null },
      { createdAt: new Date('2026-01-02'), id: 'key-b', name: 'Second', prefix: 'inv_bbb', revokedAt: null },
      { createdAt: new Date('2026-01-03'), id: 'key-c', name: 'Third', prefix: 'inv_ccc', revokedAt: null },
    ];
    const { db, mockSelectResult } = createMockDb();
    mockSelectResult.push(...keys);

    const result = await listApiKeys(db, 'user-789');

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('key-a');
    expect(result[1].id).toBe('key-b');
    expect(result[2].id).toBe('key-c');
  });
});

describe('revokeApiKey', () => {
  it('returns true when key is successfully revoked', async () => {
    const { db, mockUpdate } = createMockDb();
    mockUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      })),
    }));

    const result = await revokeApiKey(db, 'key-123', 'user-456');

    expect(result).toBe(true);
  });

  it('returns false when key not found or already revoked', async () => {
    const { db, mockUpdate } = createMockDb();
    mockUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
      })),
    }));

    const result = await revokeApiKey(db, 'key-notfound', 'user-456');

    expect(result).toBe(false);
  });

  it('uses update with correct where clause', async () => {
    const { db, mockUpdate } = createMockDb();
    const mockWhere = vi.fn().mockResolvedValue({ rowsAffected: 1 });
    mockUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: mockWhere,
      })),
    }));

    await revokeApiKey(db, 'key-xyz', 'user-abc');

    expect(mockWhere).toHaveBeenCalledOnce();
  });
});

describe('rotateApiKey', () => {
  it('returns null when key not found', async () => {
    const { db, mockSelectResult } = createMockDb();
    mockSelectResult.length = 0;

    const result = await rotateApiKey(db, 'key-notfound', 'user-123');

    expect(result).toBeNull();
  });

  it('returns new key when rotation succeeds', async () => {
    const { db, mockSelectResult, mockBatch } = createMockDb();
    mockSelectResult.push({ name: 'Old Key', revokedAt: null, userId: 'user-123' });
    mockBatch.mockResolvedValue([undefined, undefined]);

    const result = await rotateApiKey(db, 'key-old', 'user-123');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      createdAt: expect.any(Date),
      fullKey: expect.stringMatching(/^inv_/),
      id: expect.any(String),
      name: 'Old Key',
      prefix: expect.stringMatching(/^inv_/),
    });
  });

  it('uses db.batch for atomicity', async () => {
    const { db, mockSelectResult, mockBatch } = createMockDb();
    mockSelectResult.push({ name: 'Test Key', revokedAt: null, userId: 'user-456' });
    mockBatch.mockResolvedValue([undefined, undefined]);

    await rotateApiKey(db, 'key-id', 'user-456');

    expect(mockBatch).toHaveBeenCalledOnce();
  });

  it('preserves key name from old key', async () => {
    const { db, mockSelectResult, mockBatch } = createMockDb();
    mockSelectResult.push({ name: 'Production API', revokedAt: null, userId: 'user-789' });
    mockBatch.mockResolvedValue([undefined, undefined]);

    const result = await rotateApiKey(db, 'key-prod', 'user-789');

    expect(result?.name).toBe('Production API');
  });
});
