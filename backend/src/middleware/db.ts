import { getDb } from '@backend/db';
import type { Bindings, Variables } from '@backend/types';
import type { D1Database } from '@cloudflare/workers-types';
import { createMiddleware } from 'hono/factory';

export const dbMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const db = getDb(c.env as { DB: D1Database });
  c.set('db', db);
  await next();
});
