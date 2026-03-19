#!/usr/bin/env npx tsx
/**
 * Local smoke test for invoice-recognizer API.
 *
 * Prerequisites:
 * - Dev server running at BASE_URL (default: http://localhost:3000)
 * - SESSION_COOKIE set for initial authentication
 * - This is a developer workflow script, not production-grade
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 SESSION_COOKIE="..." npm run smoke
 *   # or with env vars
 *   npx tsx scripts/smoke-test.ts
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SESSION_COOKIE = process.env.SESSION_COOKIE ?? '';

// Minimal 1x1 PNG (67 bytes when decoded)
const MINIMAL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

interface ApiKey {
  id: string;
  prefix: string;
  key: string;
  createdAt: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  r2Key: string;
  expiresAt: string;
}

interface TaskResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorCode?: string;
  result?: Record<string, string>;
}

interface Template {
  id: string;
  name: string;
}

/**
 * Helper to build auth headers
 */
function authHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE;
  }

  return headers;
}

/**
 * Helper for logging with timestamp
 */
function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/**
 * Step 1: Get first template ID
 */
async function getTemplateId(): Promise<string> {
  log('Step 1: Fetching templates...');
  const res = await fetch(`${BASE_URL}/api/templates`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.status} ${res.statusText}`);
  }

  const { templates } = (await res.json()) as { templates: Template[] };
  if (!templates || templates.length === 0) {
    throw new Error('No templates available');
  }

  const templateId = templates[0].id;
  log(`✓ Got template ID: ${templateId}`);
  return templateId;
}

/**
 * Step 2: Create an API key
 */
async function createApiKey(): Promise<ApiKey> {
  log('Step 2: Creating API key...');

  if (!SESSION_COOKIE) {
    throw new Error('SESSION_COOKIE env var not set; cannot authenticate API key creation');
  }

  const res = await fetch(`${BASE_URL}/api/api-keys`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'smoke-test-key' }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create API key: ${res.status} ${res.statusText}`);
  }

  const apiKey = (await res.json()) as ApiKey;
  log(`✓ Created API key: ${apiKey.prefix}...`);
  return apiKey;
}

/**
 * Step 3: Get upload URL
 */
async function getUploadUrl(apiKey: string): Promise<UploadUrlResponse> {
  log('Step 3: Getting upload URL...');

  const pngBuffer = Buffer.from(MINIMAL_PNG_B64, 'base64');

  const res = await fetch(`${BASE_URL}/api/upload-url`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      filename: 'smoke-test-sample.png',
      contentType: 'image/png',
      size: pngBuffer.length,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get upload URL: ${res.status} ${res.statusText}`);
  }

  const uploadInfo = (await res.json()) as UploadUrlResponse;
  log(`✓ Got upload URL (expires: ${uploadInfo.expiresAt})`);
  log(`  R2 key: ${uploadInfo.r2Key}`);
  return uploadInfo;
}

/**
 * Step 4: Upload PNG to presigned URL
 */
async function uploadPng(uploadUrl: string): Promise<void> {
  log('Step 4: Uploading PNG to presigned URL...');

  const pngBuffer = Buffer.from(MINIMAL_PNG_B64, 'base64');

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
    },
    body: pngBuffer,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload PNG: ${res.status} ${res.statusText}`);
  }

  log(`✓ Uploaded ${pngBuffer.length} bytes`);
}

/**
 * Step 5: Create task
 */
async function createTask(apiKey: string, templateId: string, r2Key: string): Promise<TaskResponse> {
  log('Step 5: Creating task...');

  const res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      templateId,
      r2Key,
      disclaimerAccepted: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create task: ${res.status} ${res.statusText}`);
  }

  const task = (await res.json()) as TaskResponse;
  log(`✓ Created task: ${task.id} (status: ${task.status})`);
  return task;
}

/**
 * Step 6: Poll task until terminal state
 */
async function pollTask(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 30,
  intervalMs: number = 1000,
): Promise<TaskResponse> {
  log('Step 6: Polling task status...');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'GET',
      headers: authHeaders(apiKey),
    });

    if (!res.ok) {
      throw new Error(`Failed to poll task: ${res.status} ${res.statusText}`);
    }

    const task = (await res.json()) as TaskResponse;
    log(`  [${attempt + 1}/${maxAttempts}] Status: ${task.status}`);

    if (task.status === 'completed') {
      log(`✓ Task completed successfully`);
      return task;
    }

    if (task.status === 'failed') {
      log(`✗ Task failed (error: ${task.errorCode})`);
      return task;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Task polling timeout after ${maxAttempts} attempts (${maxAttempts * intervalMs}ms)`);
}

/**
 * Main smoke test flow
 */
async function main(): Promise<void> {
  try {
    log('=== Starting smoke test ===');
    log(`BASE_URL: ${BASE_URL}`);
    log(`SESSION_COOKIE: ${SESSION_COOKIE ? '(set)' : '(not set)'}`);
    log('');

    // Step 1: Get template
    const templateId = await getTemplateId();

    // Step 2: Create API key
    const apiKey = await createApiKey();

    // Step 3: Get upload URL
    const uploadInfo = await getUploadUrl(apiKey.key);

    // Step 4: Upload PNG
    await uploadPng(uploadInfo.uploadUrl);

    // Step 5: Create task
    const task = await createTask(apiKey.key, templateId, uploadInfo.r2Key);

    // Step 6: Poll for completion
    const finalTask = await pollTask(apiKey.key, task.id);

    log('');
    log('=== Smoke test results ===');
    log(`Task ID: ${finalTask.id}`);
    log(`Status: ${finalTask.status}`);

    if (finalTask.result) {
      log('Result data:');
      Object.entries(finalTask.result).forEach(([key, value]) => {
        log(`  ${key}: ${value}`);
      });
    }

    if (finalTask.status === 'completed') {
      log('');
      log('✓ SMOKE TEST PASSED');
      process.exit(0);
    } else {
      log('');
      log('✗ SMOKE TEST FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('');
    console.error('✗ SMOKE TEST ERROR');
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error(`Error: ${String(err)}`);
    }
    console.error('');
    process.exit(1);
  }
}

main();
