import type { Db } from '@backend/db';
import { creditWallet, userDailyUsage } from '@backend/db/schema/credits';
import { and, eq, gt, lt, sql } from 'drizzle-orm';

export type EntitlementResult =
  | { ok: true; source: 'guest_daily' | 'member_daily' | 'member_pack' }
  | { ok: false; error: 'quota_exceeded' | 'insufficient_credits' };

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const GUEST_DAILY_LIMIT = 3;
const MEMBER_DAILY_LIMIT = 20;

export async function checkAndConsumeEntitlement(options: {
  userId: string | null;
  ip?: string;
  db: Db;
  kv: KVNamespace;
  today?: string;
}): Promise<EntitlementResult> {
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  // ── GUEST ──────────────────────────────────────────────────────────────
  if (options.userId === null) {
    const ipHash = await sha256hex(options.ip ?? 'unknown');
    const kvKey = `${ipHash}:${today}`;

    const raw = await options.kv.get(kvKey);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= GUEST_DAILY_LIMIT) {
      return { ok: false, error: 'quota_exceeded' };
    }

    await options.kv.put(kvKey, String(count + 1), {
      expirationTtl: 86400,
    });

    return { ok: true, source: 'guest_daily' };
  }

  // ── MEMBER ─────────────────────────────────────────────────────────────
  const userId = options.userId;
  const db = options.db;

  // Step A: try member daily (limit 20)
  const insertStmt = db.insert(userDailyUsage).values({ userId, date: today, count: 0 }).onConflictDoNothing();

  const updateStmt = db
    .update(userDailyUsage)
    .set({ count: sql`${userDailyUsage.count} + 1` })
    .where(
      and(
        eq(userDailyUsage.userId, userId),
        eq(userDailyUsage.date, today),
        lt(userDailyUsage.count, MEMBER_DAILY_LIMIT),
      ),
    );

  const batchResults = await db.batch([insertStmt, updateStmt]);
  const updateResult = batchResults[1] as unknown as {
    rowsAffected: number;
  };

  if (updateResult.rowsAffected === 1) {
    return { ok: true, source: 'member_daily' };
  }

  // Step B: try pack credits
  const walletResult = (await db
    .update(creditWallet)
    .set({ balance: sql`${creditWallet.balance} - 1` })
    .where(and(eq(creditWallet.userId, userId), gt(creditWallet.balance, 0)))) as unknown as { rowsAffected: number };

  if (walletResult.rowsAffected === 1) {
    return { ok: true, source: 'member_pack' };
  }

  // Step C: both exhausted
  return { ok: false, error: 'insufficient_credits' };
}
