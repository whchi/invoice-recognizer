import { getDb } from '@backend/db';
import { taskResults, tasks, templates } from '@backend/db/schema';
import { GeminiService } from '@backend/lib/gemini';
import { buildGeminiPrompt, parseGeminiJson, validateAgainstTemplate } from '@backend/lib/parse';
import { eq } from 'drizzle-orm';

interface QueueEnv {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GEMINI_API_KEY: string;
}

type ErrorCode = 'model_invalid_json' | 'model_schema_mismatch' | 'transient_upstream' | 'task_not_found';

async function processMessage(taskId: string, env: QueueEnv): Promise<void> {
  const db = getDb(env);

  const [task] = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      r2Key: tasks.r2Key,
      templateId: tasks.templateId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) return;
  if (task.status !== 'queued') return;

  const casResult = await env.DB.prepare(
    "UPDATE tasks SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'queued'",
  )
    .bind(Math.floor(Date.now() / 1000), taskId)
    .run();

  if ((casResult as unknown as { meta: { rows_written: number } }).meta.rows_written === 0) {
    return;
  }

  if (!task.templateId) {
    await setFailed(db, taskId, 'task_not_found');
    try {
      await env.R2_BUCKET.delete(task.r2Key);
    } catch {}
    return;
  }

  const [template] = await db
    .select({ id: templates.id, fields: templates.fields })
    .from(templates)
    .where(eq(templates.id, task.templateId))
    .limit(1);

  if (!template) {
    await setFailed(db, taskId, 'task_not_found');
    try {
      await env.R2_BUCKET.delete(task.r2Key);
    } catch {}
    return;
  }

  const templateFields: string[] = JSON.parse(template.fields);

  const r2Object = await env.R2_BUCKET.get(task.r2Key);
  if (!r2Object) {
    await setFailed(db, taskId, 'task_not_found');
    return;
  }

  const arrayBuffer = await r2Object.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const mimeType = r2Object.httpMetadata?.contentType ?? 'application/octet-stream';

  const { systemPrompt, userPrompt } = buildGeminiPrompt(templateFields);

  const gemini = new GeminiService(env.GEMINI_API_KEY);
  gemini.setup({ responseMimeType: 'application/json' });
  let rawText: string;
  try {
    rawText = await gemini.sendWithImage(userPrompt, base64, mimeType, systemPrompt);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('transient_')) {
      throw err;
    }
    await setFailed(db, taskId, 'model_invalid_json');
    try {
      await env.R2_BUCKET.delete(task.r2Key);
    } catch {}
    return;
  }

  const parseResult = parseGeminiJson(rawText);
  if (!parseResult.ok) {
    await setFailed(db, taskId, 'model_invalid_json');
    try {
      await env.R2_BUCKET.delete(task.r2Key);
    } catch {}
    return;
  }

  const validation = validateAgainstTemplate(parseResult.data, templateFields);
  if (!validation.ok) {
    await setFailed(db, taskId, 'model_schema_mismatch');
    try {
      await env.R2_BUCKET.delete(task.r2Key);
    } catch {}
    return;
  }

  await db.batch([
    db.update(tasks).set({ status: 'completed', updatedAt: new Date() }).where(eq(tasks.id, taskId)),
    db.insert(taskResults).values({
      taskId,
      result: JSON.stringify(validation.validated),
    }),
  ]);

  try {
    await env.R2_BUCKET.delete(task.r2Key);
  } catch {}
}

async function setFailed(db: ReturnType<typeof getDb>, taskId: string, errorCode: ErrorCode): Promise<void> {
  await db.update(tasks).set({ status: 'failed', errorCode, updatedAt: new Date() }).where(eq(tasks.id, taskId));
}

export async function handleQueue(batch: MessageBatch<{ taskId: string }>, env: QueueEnv): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processMessage(message.body.taskId, env);
    } catch {
      message.retry();
      continue;
    }
    message.ack();
  }
}
