import type { Db } from '@backend/db';
import { apiKeys } from '@backend/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a cryptographically random API key with `inv_` prefix. */
function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url encode (no padding)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `inv_${base64}`;
}

/** SHA-256 hash a string, return lowercase hex. */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface CreateApiKeyResult {
  id: string;
  prefix: string;
  fullKey: string; // shown ONCE
  name: string;
  createdAt: Date;
}

/**
 * Create a new API key for a user.
 * Returns the full key exactly once — only the hash is persisted.
 */
export async function createApiKey(db: Db, userId: string, name: string): Promise<CreateApiKeyResult> {
  const id = ulid();
  const fullKey = generateRawKey();
  const keyHash = await hashKey(fullKey);
  const keyPrefix = fullKey.slice(0, 8);
  const createdAt = new Date();

  await db.insert(apiKeys).values({
    id,
    userId,
    name,
    keyHash,
    keyPrefix,
    createdAt,
  });

  return { id, prefix: keyPrefix, fullKey, name, createdAt };
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date | null;
  revokedAt: Date | null;
}

/** List all API keys for a user (active + revoked). */
export async function listApiKeys(db: Db, userId: string): Promise<ApiKeyListItem[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return rows;
}

/**
 * Revoke an API key by setting `revokedAt`.
 * Only succeeds if the key belongs to `userId` and is not already revoked.
 * Returns true if a row was updated.
 */
export async function revokeApiKey(db: Db, keyId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  return (result as unknown as { rowsAffected: number }).rowsAffected > 0;
}

/**
 * Rotate an API key: revoke the old one and create a new one with the same name.
 * Uses db.batch() for atomicity (D1 does not support transactions).
 * Returns the new key result, or null if the old key was not found / not owned.
 */
export async function rotateApiKey(db: Db, keyId: string, userId: string): Promise<CreateApiKeyResult | null> {
  // First, look up the existing key to get its name
  const [existing] = await db
    .select({ name: apiKeys.name, userId: apiKeys.userId, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!existing) return null;

  // Prepare the new key
  const newId = ulid();
  const fullKey = generateRawKey();
  const keyHash = await hashKey(fullKey);
  const keyPrefix = fullKey.slice(0, 8);
  const createdAt = new Date();
  const now = new Date();

  // Batch: revoke old + insert new
  await db.batch([
    db
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt))),
    db.insert(apiKeys).values({
      id: newId,
      userId,
      name: existing.name,
      keyHash,
      keyPrefix,
      createdAt,
    }),
  ]);

  return { id: newId, prefix: keyPrefix, fullKey, name: existing.name, createdAt };
}

// Re-export hashKey for use in auth middleware
export { hashKey };
