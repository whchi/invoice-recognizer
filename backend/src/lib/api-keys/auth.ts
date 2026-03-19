import type { Db } from '@backend/db';
import { apiKeys } from '@backend/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { hashKey } from './index';

export interface AuthResult {
  userId: string;
}

/**
 * Authenticate an incoming request via Bearer API key or session callback.
 *
 * 1. Check `Authorization: Bearer <key>` header
 * 2. If found: hash the key → look up in D1 where hash matches AND not revoked
 * 3. If not found or revoked: call getSession() callback
 * 4. Returns `{ userId }` or `null`
 */
export async function authenticateRequest(config: {
  req: Request;
  db: Db;
  getSession: () => Promise<unknown>;
}): Promise<AuthResult | null> {
  const { req, db, getSession } = config;

  // --- 1. Try Bearer token ---
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) {
      const keyHash = await hashKey(token);

      const [row] = await db
        .select({ userId: apiKeys.userId })
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);

      if (row) {
        return { userId: row.userId };
      }
      // Bearer was provided but invalid/revoked — do NOT fall back to session
      // (explicit API key usage should fail explicitly)
      return null;
    }
  }

  // --- 2. Fall back to session callback ---
  const session = await getSession();
  const sessionObj = session as { user?: { id?: string } } | null;
  if (sessionObj?.user?.id) {
    return { userId: sessionObj.user.id };
  }

  return null;
}
