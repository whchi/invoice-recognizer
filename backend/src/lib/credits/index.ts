import type { Db } from '@backend/db';
import { creditWallet, redeemCodes, userDailyUsage } from '@backend/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hash a string, return lowercase hex. */
async function hashCode(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Today's date as YYYY-MM-DD string. */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generate redeem code
// ---------------------------------------------------------------------------

/**
 * Generate a random 16-char alphanumeric redeem code, store its SHA-256 hash.
 * Returns the raw code (shown once) and the DB row id.
 */
export async function generateRedeemCode(credits: number, db: Db): Promise<{ code: string; id: string }> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let raw = '';
  for (let i = 0; i < 16; i++) {
    raw += chars[bytes[i] % chars.length];
  }

  // Format as XXXX-XXXX-XXXX-XXXX
  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;

  const codeHash = await hashCode(code);
  const id = ulid();

  await db.insert(redeemCodes).values({
    id,
    codeHash,
    credits,
    createdAt: new Date(),
  });

  return { code, id };
}

// ---------------------------------------------------------------------------
// Redeem code
// ---------------------------------------------------------------------------

export type RedeemResult =
  | { ok: true; credits: number; newBalance: number }
  | { ok: false; error: 'code_not_found' | 'already_redeemed' };

/**
 * Redeem a code for a user:
 * 1. Hash the input code
 * 2. Find unredeemed row matching codeHash
 * 3. Atomically mark redeemed + upsert wallet balance
 */
export async function redeemCode(code: string, userId: string, db: Db): Promise<RedeemResult> {
  const codeHash = await hashCode(code);

  // Look up the code
  const [row] = await db
    .select({
      id: redeemCodes.id,
      credits: redeemCodes.credits,
      redeemedAt: redeemCodes.redeemedAt,
    })
    .from(redeemCodes)
    .where(eq(redeemCodes.codeHash, codeHash))
    .limit(1);

  if (!row) {
    return { ok: false, error: 'code_not_found' };
  }

  if (row.redeemedAt !== null) {
    return { ok: false, error: 'already_redeemed' };
  }

  // Atomically redeem + credit wallet
  const [updateResult] = await db.batch([
    db
      .update(redeemCodes)
      .set({ redeemedAt: new Date(), redeemedBy: userId })
      .where(and(eq(redeemCodes.id, row.id), isNull(redeemCodes.redeemedAt))),
    db
      .insert(creditWallet)
      .values({ userId, balance: row.credits })
      .onConflictDoUpdate({
        target: creditWallet.userId,
        set: {
          balance: sql`${creditWallet.balance} + ${row.credits}`,
          updatedAt: new Date(),
        },
      }),
  ]);

  // Check race condition — if update matched 0 rows, code was already redeemed
  const affected = (updateResult as unknown as { rowsAffected: number }).rowsAffected;
  if (affected === 0) {
    return { ok: false, error: 'already_redeemed' };
  }

  // Fetch the new balance
  const [wallet] = await db
    .select({ balance: creditWallet.balance })
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);

  return {
    ok: true,
    credits: row.credits,
    newBalance: wallet?.balance ?? row.credits,
  };
}

// ---------------------------------------------------------------------------
// Get wallet
// ---------------------------------------------------------------------------

export interface WalletInfo {
  balance: number;
  dailyUsed: number;
  dailyDate: string;
  dailyRemaining: number;
}

/**
 * Get a user's wallet info: pack credit balance + daily usage.
 */
export async function getWallet(userId: string, db: Db): Promise<WalletInfo> {
  const today = todayStr();

  const [walletRow] = await db
    .select({ balance: creditWallet.balance })
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);

  const [usageRow] = await db
    .select({ count: userDailyUsage.count })
    .from(userDailyUsage)
    .where(and(eq(userDailyUsage.userId, userId), eq(userDailyUsage.date, today)))
    .limit(1);

  const balance = walletRow?.balance ?? 0;
  const dailyUsed = usageRow?.count ?? 0;

  return {
    balance,
    dailyUsed,
    dailyDate: today,
    dailyRemaining: Math.max(0, 20 - dailyUsed),
  };
}

// Re-export for testing
export { hashCode };
