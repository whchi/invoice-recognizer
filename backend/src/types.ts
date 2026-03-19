import type { Db } from '@backend/db';

export type Bindings = {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  TASK_QUEUE: Queue;
  RATE_LIMIT: KVNamespace;
  GEMINI_API_KEY: string;
  ADMIN_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_S3_ENDPOINT: string;
  R2_BUCKET_NAME: string;
};

export type Variables = {
  db: Db;
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  } | null;
};
