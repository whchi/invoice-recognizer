import { app } from '@backend/index';
import { handleQueue } from '@backend/lib/queue/consumer';

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<{ taskId: string }>, env: Env): Promise<void> {
    await handleQueue(batch, {
      DB: env.DB,
      R2_BUCKET: env.R2_BUCKET,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
    });
  },
};

interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GEMINI_API_KEY: string;
  TASK_QUEUE: Queue;
  RATE_LIMIT: KVNamespace;
  ADMIN_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_S3_ENDPOINT: string;
  R2_BUCKET_NAME: string;
}
