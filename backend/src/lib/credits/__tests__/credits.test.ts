import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRedeemCode, getWallet, hashCode, redeemCode } from '../index';

// ---------------------------------------------------------------------------
// Mock ulid for deterministic IDs
// ---------------------------------------------------------------------------
let ulidCounter = 0;
vi.mock('ulid', () => ({
  ulid: () => `01TESTCODE${String(++ulidCounter).padStart(14, '0')}`,
}));

// ---------------------------------------------------------------------------
// Mock crypto.getRandomValues for deterministic code generation
// ---------------------------------------------------------------------------
beforeEach(() => {
  ulidCounter = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: ArrayBufferView) => {
    const uint8 = new Uint8Array((array as Uint8Array).buffer);
    for (let i = 0; i < uint8.length; i++) {
      uint8[i] = (i * 7 + 42) % 256; // deterministic pattern
    }
    return array as Uint8Array;
  });
});

// ---------------------------------------------------------------------------
// Mock D1 database (Drizzle-compatible)
// ---------------------------------------------------------------------------

function createMockDb() {
  const mockInsert = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation(() => {
      // Support onConflictDoUpdate chain
      return {
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        then: (resolve: (v: unknown) => void) => resolve(undefined),
      };
    }),
  }));

  const mockSelectResult: unknown[] = [];

  const mockSelect = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockResolvedValue(mockSelectResult),
      })),
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
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      batch: mockBatch,
    } as unknown as import('@backend/db').Db,
    mockInsert,
    mockSelect,
    mockUpdate,
    mockBatch,
    mockSelectResult,
  };
}

// ---------------------------------------------------------------------------
// hashCode
// ---------------------------------------------------------------------------

describe('hashCode', () => {
  it('returns a 64-char lowercase hex string', async () => {
    const hash = await hashCode('ABCD-EFGH-IJKL-MNOP');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent hashes', async () => {
    const h1 = await hashCode('XXXX-XXXX-XXXX-XXXX');
    const h2 = await hashCode('XXXX-XXXX-XXXX-XXXX');
    expect(h1).toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// generateRedeemCode
// ---------------------------------------------------------------------------

describe('generateRedeemCode', () => {
  it('inserts row and returns code in XXXX-XXXX-XXXX-XXXX format', async () => {
    const { db, mockInsert } = createMockDb();
    const result = await generateRedeemCode(100, db);

    // Code format: 4 groups of 4 alphanum separated by dashes
    expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.id).toMatch(/^01TESTCODE/);

    // Verify insert was called
    expect(mockInsert).toHaveBeenCalled();
    const insertChain = mockInsert.mock.results[0].value;
    expect(insertChain.values).toHaveBeenCalled();
    const insertedValues = insertChain.values.mock.calls[0][0];
    expect(insertedValues.credits).toBe(100);
    expect(insertedValues.codeHash).toMatch(/^[0-9a-f]{64}$/);
    // Raw code is NOT stored — only hash
    expect(insertedValues.codeHash).not.toBe(result.code);
  });
});

// ---------------------------------------------------------------------------
// redeemCode
// ---------------------------------------------------------------------------

describe('redeemCode', () => {
  it('success path: updates both tables, returns ok:true', async () => {
    const { db, mockSelect, mockUpdate, mockBatch } = createMockDb();

    // First select: find the code row (unredeemed)
    let selectCallCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // First call: lookup code
              return Promise.resolve([{ id: 'code-1', credits: 50, redeemedAt: null }]);
            }
            // Second call: get wallet balance after upsert
            return Promise.resolve([{ balance: 150 }]);
          }),
        })),
      })),
    }));

    // Batch resolves with update result that has rowsAffected=1
    (db.batch as ReturnType<typeof vi.fn>).mockResolvedValue([{ rowsAffected: 1 }, undefined]);

    const result = await redeemCode('ABCD-EFGH-IJKL-MNOP', 'user-1', db);

    expect(result).toEqual({
      ok: true,
      credits: 50,
      newBalance: 150,
    });
    expect(db.batch).toHaveBeenCalled();
  });

  it("code not found: returns { ok: false, error: 'code_not_found' }", async () => {
    const { db } = createMockDb();

    // select returns empty array
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const result = await redeemCode('XXXX-XXXX-XXXX-XXXX', 'user-1', db);
    expect(result).toEqual({ ok: false, error: 'code_not_found' });
  });

  it("already redeemed (redeemedAt set): returns { ok: false, error: 'already_redeemed' }", async () => {
    const { db } = createMockDb();

    // select returns a code that has redeemedAt set
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'code-2', credits: 50, redeemedAt: new Date() }]),
        }),
      }),
    }));

    const result = await redeemCode('ABCD-EFGH-IJKL-MNOP', 'user-1', db);
    expect(result).toEqual({ ok: false, error: 'already_redeemed' });
  });

  it("race condition (rowsAffected=0): returns { ok: false, error: 'already_redeemed' }", async () => {
    const { db } = createMockDb();

    // select returns unredeemed code
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'code-3', credits: 25, redeemedAt: null }]),
        }),
      }),
    }));

    // batch returns rowsAffected=0 (race condition)
    (db.batch as ReturnType<typeof vi.fn>).mockResolvedValue([{ rowsAffected: 0 }, undefined]);

    const result = await redeemCode('ABCD-EFGH-IJKL-MNOP', 'user-1', db);
    expect(result).toEqual({ ok: false, error: 'already_redeemed' });
  });
});

// ---------------------------------------------------------------------------
// getWallet
// ---------------------------------------------------------------------------

describe('getWallet', () => {
  it('no rows: returns defaults (balance: 0, dailyUsed: 0)', async () => {
    const { db } = createMockDb();

    // Both selects return empty
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));

    const result = await getWallet('user-1', db);
    expect(result.balance).toBe(0);
    expect(result.dailyUsed).toBe(0);
    expect(result.dailyRemaining).toBe(20);
    expect(result.dailyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('existing rows: returns correct values', async () => {
    const { db } = createMockDb();

    let selectCallCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // wallet balance
              return Promise.resolve([{ balance: 200 }]);
            }
            // daily usage
            return Promise.resolve([{ count: 5 }]);
          }),
        })),
      })),
    }));

    const result = await getWallet('user-1', db);
    expect(result.balance).toBe(200);
    expect(result.dailyUsed).toBe(5);
    expect(result.dailyRemaining).toBe(15);
    expect(result.dailyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
