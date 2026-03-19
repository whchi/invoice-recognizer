// Typed API client for all backend endpoints
// Auth handled by better-auth client (cookie-based sessions)

import { createAuthClient } from 'better-auth/react';

// ─── Auth Client ────────────────────────────────────────────────────────────
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type WalletResponse = {
  balance: number;
  dailyDate: string;
  dailyRemaining: number;
  dailyUsed: number;
};

export type RedeemResponse = {
  credits: number;
  newBalance: number;
};

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyListResponse = {
  keys: ApiKey[];
};

export type CreateApiKeyResponse = {
  id: string;
  name: string;
  prefix: string;
  fullKey: string;
  createdAt: string;
};

export type RotateApiKeyResponse = {
  id: string;
  name: string;
  prefix: string;
  fullKey: string;
  createdAt: string;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  r2Key: string;
  expiresAt: string;
};

export type TaskResponse = {
  id: string;
  status: string;
  createdAt: string | null;
  result?: Record<string, unknown>;
  retryAfter?: number;
};

export type Template = {
  id: string;
  name: string;
  fields: string[];
  createdAt: string | null;
  createdBy: string | null;
};

export type TemplateListResponse = {
  templates: Template[];
};

export type CreateTemplateResponse = {
  id: string;
};

export type OkResponse = {
  ok: boolean;
};

export type FavoriteResponse = {
  ok: boolean;
  favorited: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getSession(): Promise<{ user?: SessionUser }> {
  const session = await authClient.getSession();
  if (session.data?.user) {
    return { user: session.data.user as SessionUser };
  }
  return {};
}

export async function signIn(email: string, password: string): Promise<void> {
  const result = await authClient.signIn.email({ email, password });
  if (result.error) {
    throw new Error(result.error.message ?? 'Sign in failed');
  }
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export async function getWallet(): Promise<WalletResponse> {
  return apiFetch<WalletResponse>('/api/credits/wallet');
}

export async function redeemCode(code: string): Promise<RedeemResponse> {
  return apiFetch<RedeemResponse>('/api/credits/redeem', {
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKeyListResponse> {
  return apiFetch<ApiKeyListResponse>('/api/api-keys');
}

export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  return apiFetch<CreateApiKeyResponse>('/api/api-keys', {
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

export async function deleteApiKey(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/api-keys/${id}`, { method: 'DELETE' });
}

export async function rotateApiKey(id: string): Promise<RotateApiKeyResponse> {
  return apiFetch<RotateApiKeyResponse>(`/api/api-keys/${id}/rotate`, { method: 'POST' });
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function getUploadUrl(filename: string, contentType: string, size: number): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>('/api/upload-url', {
    body: JSON.stringify({ contentType, filename, size }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

export async function uploadToR2(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    body: file,
    headers: { 'Content-Type': file.type },
    method: 'PUT',
  });
  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status}`);
  }
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function createTask(
  r2Key: string,
  templateId?: string,
  disclaimerAccepted?: boolean,
  idempotencyKey?: string,
): Promise<TaskResponse> {
  return apiFetch<TaskResponse>('/api/tasks', {
    body: JSON.stringify({ disclaimerAccepted, idempotencyKey, r2Key, templateId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  const res = await fetch(`/api/tasks/${taskId}`);
  const retryAfter = res.headers.get('Retry-After');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`getTask failed ${res.status}: ${body}`);
  }
  const data = (await res.json()) as TaskResponse;
  if (retryAfter) {
    data.retryAfter = parseInt(retryAfter, 10);
  }
  return data;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<TemplateListResponse> {
  return apiFetch<TemplateListResponse>('/api/templates');
}

export async function createTemplate(name: string, fields: string[]): Promise<CreateTemplateResponse> {
  return apiFetch<CreateTemplateResponse>('/api/templates', {
    body: JSON.stringify({ fields, name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

export async function getTemplate(id: string): Promise<Template> {
  return apiFetch<Template>(`/api/templates/${id}`);
}

export async function updateTemplate(id: string, name?: string, fields?: string[]): Promise<OkResponse> {
  return apiFetch<OkResponse>(`/api/templates/${id}`, {
    body: JSON.stringify({ fields, name }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
}

export async function deleteTemplate(id: string): Promise<OkResponse> {
  return apiFetch<OkResponse>(`/api/templates/${id}`, { method: 'DELETE' });
}

export async function toggleFavorite(id: string): Promise<FavoriteResponse> {
  return apiFetch<FavoriteResponse>(`/api/templates/${id}/favorite`, { method: 'POST' });
}

export async function setDefault(id: string): Promise<OkResponse> {
  return apiFetch<OkResponse>(`/api/templates/${id}/default`, { method: 'POST' });
}
