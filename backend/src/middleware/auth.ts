import * as schema from '@backend/db/schema';
import { apiKeys } from '@backend/db/schema';
import { hashKey } from '@backend/lib/api-keys';
import type { Bindings, Variables } from '@backend/types';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { Context } from 'hono';

// ---------------------------------------------------------------------------
// Piece 1 — better-auth instance factory (per-request, since env is dynamic)
// ---------------------------------------------------------------------------

export function getAuth(env: Bindings) {
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    basePath: '/api/auth',
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins: ['http://localhost:5173'],
  });
}

// ---------------------------------------------------------------------------
// Piece 2 — Session middleware (sets user/session on context)
// ---------------------------------------------------------------------------

export async function sessionMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: () => Promise<void>,
): Promise<void> {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session) {
    c.set('user', session.user);
    c.set('session', session.session);
  } else {
    c.set('user', null);
    c.set('session', null);
  }

  await next();
}

// ---------------------------------------------------------------------------
// Piece 3 — Require-auth middleware (rejects unauthenticated requests)
// ---------------------------------------------------------------------------

export async function requireAuth(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: () => Promise<void>,
): Promise<Response | void> {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}

// ---------------------------------------------------------------------------
// Piece 4 — API key auth helper
// ---------------------------------------------------------------------------

export interface AuthResult {
  userId: string;
}

export async function authenticateRequest(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
): Promise<AuthResult | null> {
  // 1. Try Bearer token
  const authHeader = c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) {
      const keyHash = await hashKey(token);
      const db = c.get('db');

      const [row] = await db
        .select({ userId: apiKeys.userId })
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);

      if (row) {
        return { userId: row.userId };
      }
      // Bearer was provided but invalid/revoked — do NOT fall back to session
      return null;
    }
  }

  // 2. Fall back to better-auth session
  const user = c.get('user');
  if (user?.id) {
    return { userId: user.id };
  }

  return null;
}
