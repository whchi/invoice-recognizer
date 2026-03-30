# Backend Export API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立後端匯出 API，支援單一任務或多筆任務結果匯出為 JSON、CSV、XML 格式

**Architecture:** 
- 新增 `GET /api/tasks/:id/export` 路由，支援 `?format=json|csv|xml` 參數
- 建立 `backend/src/lib/export/` 模組，包含格式轉換邏輯
- CSV 使用純文字組裝，XML 使用簡單模板字串（不引入額外依賴）

**Tech Stack:** Hono, Drizzle ORM, Zod（schema validation）

---

## File Structure

### New Files
- `backend/src/lib/export/index.ts` — 匯出格式轉換邏輯（json/csv/xml）
- `backend/src/lib/export/__tests__/export.test.ts` — 匯出功能單元測試
- `backend/src/routes/tasks/export.ts` — 匯出路由處理器

### Modified Files
- `backend/src/routes/tasks/index.ts` — 註冊匯出路由
- `backend/src/routes/tasks/schema.ts` — 新增匯出相關 Zod schemas

---

## Task 1: Create Export Formatter Library

**Files:**
- Create: `backend/src/lib/export/index.ts`
- Test: `backend/src/lib/export/__tests__/export.test.ts`

- [ ] **Step 1: Write the failing test for JSON export**

```typescript
import { describe, expect, it } from 'vitest';
import { exportToJson, exportToCsv, exportToXml } from '../index';

describe('exportToJson', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns formatted JSON with proper indentation', () => {
    const result = exportToJson(mockTaskResult);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(mockTaskResult);
  });

  it('handles nested objects', () => {
    const nested = {
      invoice: { number: 'AB-12345678', amount: 1500 },
      vendor: { name: 'Test Store', tax_id: '12345678' },
    };
    const result = exportToJson(nested);
    const parsed = JSON.parse(result);
    expect(parsed.invoice.number).toBe('AB-12345678');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: FAIL with "exportToJson is not defined"

- [ ] **Step 3: Implement JSON export function**

Create `backend/src/lib/export/index.ts`:

```typescript
/**
 * Export task result to formatted JSON
 */
export function exportToJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}
```

- [ ] **Step 4: Run test to verify JSON export passes**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: PASS for JSON tests

- [ ] **Step 5: Write failing test for CSV export**

Add to `backend/src/lib/export/__tests__/export.test.ts`:

```typescript
describe('exportToCsv', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns CSV with headers and values', () => {
    const result = exportToCsv(mockTaskResult);
    expect(result).toContain('invoice_number,amount,date,vendor');
    expect(result).toContain('AB-12345678,1500,2024-01-15,Test Store');
  });

  it('handles values with commas by quoting', () => {
    const withComma = { description: 'Item, with comma', amount: 100 };
    const result = exportToCsv(withComma);
    expect(result).toContain('"Item, with comma"');
  });

  it('handles values with quotes by escaping', () => {
    const withQuote = { description: 'Item "quoted"', amount: 100 };
    const result = exportToCsv(withQuote);
    expect(result).toContain('"Item ""quoted"""');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: FAIL with "exportToCsv is not defined"

- [ ] **Step 7: Implement CSV export function**

Add to `backend/src/lib/export/index.ts`:

```typescript
/**
 * Escape CSV value - handles commas, quotes, and newlines
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export task result to CSV format
 */
export function exportToCsv(data: Record<string, unknown>): string {
  const headers = Object.keys(data);
  const values = headers.map(key => {
    const value = data[key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return escapeCsvValue(JSON.stringify(value));
    return escapeCsvValue(String(value));
  });

  return [headers.join(','), values.join(',')].join('\n');
}
```

- [ ] **Step 8: Run test to verify CSV export passes**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: PASS for CSV tests

- [ ] **Step 9: Write failing test for XML export**

Add to `backend/src/lib/export/__tests__/export.test.ts`:

```typescript
describe('exportToXml', () => {
  const mockTaskResult = {
    invoice_number: 'AB-12345678',
    amount: 1500,
    date: '2024-01-15',
    vendor: 'Test Store',
  };

  it('returns valid XML structure', () => {
    const result = exportToXml(mockTaskResult);
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain('<invoice>');
    expect(result).toContain('<invoice_number>AB-12345678</invoice_number>');
    expect(result).toContain('</invoice>');
  });

  it('escapes XML special characters', () => {
    const withSpecial = { description: 'Item <with> & "special" chars', amount: 100 };
    const result = exportToXml(withSpecial);
    expect(result).toContain('&lt;with&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;special&quot;');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: FAIL with "exportToXml is not defined"

- [ ] **Step 11: Implement XML export function**

Add to `backend/src/lib/export/index.ts`:

```typescript
/**
 * Escape XML special characters
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export task result to XML format
 */
export function exportToXml(data: Record<string, unknown>): string {
  const fields = Object.entries(data)
    .map(([key, value]) => {
      const stringValue = value === null || value === undefined 
        ? '' 
        : typeof value === 'object' 
          ? escapeXml(JSON.stringify(value)) 
          : escapeXml(String(value));
      return `  <${key}>${stringValue}</${key}>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<invoice>\n${fields}\n</invoice>`;
}
```

- [ ] **Step 12: Run test to verify XML export passes**

```bash
npx vitest run backend/src/lib/export/__tests__/export.test.ts
```

Expected: ALL TESTS PASS

- [ ] **Step 13: Commit**

```bash
git add backend/src/lib/export/
git commit -m "feat: add export formatters (json, csv, xml) with tests"
```

---

## Task 2: Create Export Route Handler

**Files:**
- Create: `backend/src/routes/tasks/export.ts`
- Modify: `backend/src/routes/tasks/schema.ts`

- [ ] **Step 1: Add export schema definitions**

Add to `backend/src/routes/tasks/schema.ts`:

```typescript
export const ExportFormatSchema = z
  .enum(['json', 'csv', 'xml'])
  .openapi({ ref: 'ExportFormat', example: 'json' });

export const ExportQuerySchema = z
  .object({
    format: ExportFormatSchema.optional().default('json'),
  })
  .openapi({ ref: 'ExportQuery' });

export const ExportResponseSchema = z
  .union([
    z.string().openapi({ description: 'Exported data' }),
    z.object({ error: z.string() }).openapi({ description: 'Error response' }),
  ])
  .openapi({ ref: 'ExportResponse' });
```

- [ ] **Step 2: Create export route file**

Create `backend/src/routes/tasks/export.ts`:

```typescript
import { exportToCsv, exportToJson, exportToXml } from '@backend/lib/export';
import { authenticateRequest } from '@backend/middleware/auth';
import type { Bindings, Variables } from '@backend/types';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { tasks, taskResults } from '@backend/db/schema';
import { ExportQuerySchema, ExportResponseSchema } from './schema';

export const exportRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

exportRouter.get(
  '/:id/export',
  describeRoute({
    description: 'Export task result in JSON, CSV, or XML format',
    responses: {
      200: {
        content: {
          'application/json': { schema: resolver(ExportResponseSchema) },
          'text/csv': { schema: resolver(ExportResponseSchema) },
          'application/xml': { schema: resolver(ExportResponseSchema) },
        },
        description: 'Exported task result',
      },
      400: {
        description: 'Invalid format or task not completed',
      },
      403: {
        description: 'Forbidden — not task owner',
      },
      404: {
        description: 'Task not found',
      },
    },
    summary: 'Export task result',
    tags: ['Tasks'],
  }),
  async c => {
    const authResult = await authenticateRequest(c);
    const userId = authResult?.userId ?? null;
    const taskId = c.req.param('id');
    const format = c.req.query('format') ?? 'json';
    const db = c.get('db');

    // Validate format
    if (!['json', 'csv', 'xml'].includes(format)) {
      return c.json({ error: 'invalid_format' }, 400);
    }

    // Fetch task with authorization check
    const [task] = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        status: tasks.status,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return c.json({ error: 'not_found' }, 404);
    }

    // Authorization: task owner or guest task
    if (task.userId !== null && task.userId !== userId) {
      return c.json({ error: 'forbidden' }, 403);
    }

    // Only allow export of completed tasks
    if (task.status !== 'completed') {
      return c.json({ error: 'task_not_completed' }, 400);
    }

    // Fetch result
    const [resultRow] = await db
      .select({ result: taskResults.result })
      .from(taskResults)
      .where(eq(taskResults.taskId, taskId))
      .limit(1);

    if (!resultRow) {
      return c.json({ error: 'result_not_found' }, 404);
    }

    // Parse and export based on format
    let parsedResult: Record<string, unknown>;
    try {
      parsedResult = JSON.parse(resultRow.result);
    } catch {
      return c.json({ error: 'invalid_result_data' }, 500);
    }

    // Generate export based on format
    let exportedData: string;
    let contentType: string;

    switch (format) {
      case 'csv':
        exportedData = exportToCsv(parsedResult);
        contentType = 'text/csv';
        break;
      case 'xml':
        exportedData = exportToXml(parsedResult);
        contentType = 'application/xml';
        break;
      case 'json':
      default:
        exportedData = exportToJson(parsedResult);
        contentType = 'application/json';
        break;
    }

    // Set appropriate headers for download
    const filename = `invoice_${taskId}_${new Date().toISOString().split('T')[0]}.${format}`;
    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);

    return c.body(exportedData);
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/tasks/export.ts
git add backend/src/routes/tasks/schema.ts
git commit -m "feat: add export route with json/csv/xml support"
```

---

## Task 3: Register Export Route in Tasks Router

**Files:**
- Modify: `backend/src/routes/tasks/index.ts`

- [ ] **Step 1: Import and register export router**

Add import at top of `backend/src/routes/tasks/index.ts`:

```typescript
import { exportRouter } from './export';
```

Add route registration after existing routes (after the `tasks.get('/:id', ...)` block):

```typescript
// Register export routes
exportRouter.routes.forEach(route => {
  tasks.addRoute(route[0], route[1]);
});
```

- [ ] **Step 2: Verify route compiles**

```bash
npx tsc --noEmit backend/src/routes/tasks/index.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/tasks/index.ts
git commit -m "feat: register export route in tasks router"
```

---

## Task 4: Add Route Tests

**Files:**
- Modify: `backend/src/routes/__tests__/tasks.test.ts`

- [ ] **Step 1: Add export route tests**

Add to `backend/src/routes/__tests__/tasks.test.ts`:

```typescript
describe('GET /api/tasks/:id/export', () => {
  it('returns JSON export for completed task', async () => {
    const mockTaskId = 'task-123';
    const mockResult = { invoice_number: 'AB-12345678', amount: 1500 };
    
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: mockTaskId,
        status: 'completed',
        result: JSON.stringify(mockResult),
        createdAt: new Date(),
      },
    });

    const res = await testClient(tasks).get(`/api/tasks/${mockTaskId}/export?format=json`);
    
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    
    const body = await res.json();
    expect(body.invoice_number).toBe('AB-12345678');
  });

  it('returns CSV export when format=csv', async () => {
    const mockTaskId = 'task-123';
    const mockResult = { invoice_number: 'AB-12345678', amount: 1500 };
    
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: mockTaskId,
        status: 'completed',
        result: JSON.stringify(mockResult),
        createdAt: new Date(),
      },
    });

    const res = await testClient(tasks).get(`/api/tasks/${mockTaskId}/export?format=csv`);
    
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    
    const body = await res.text();
    expect(body).toContain('invoice_number,amount');
    expect(body).toContain('AB-12345678,1500');
  });

  it('returns 400 for task not completed', async () => {
    const mockTaskId = 'task-123';
    
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: mockTaskId,
        status: 'processing',
        createdAt: new Date(),
      },
    });

    const res = await testClient(tasks).get(`/api/tasks/${mockTaskId}/export?format=json`);
    expect(res.status).toBe(400);
    
    const body = await res.json();
    expect(body.error).toBe('task_not_completed');
  });

  it('returns 400 for invalid format', async () => {
    const mockTaskId = 'task-123';
    
    mockGetTask.mockResolvedValue({
      ok: true,
      task: {
        id: mockTaskId,
        status: 'completed',
        result: '{}',
        createdAt: new Date(),
      },
    });

    const res = await testClient(tasks).get(`/api/tasks/${mockTaskId}/export?format=yaml`);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run backend/src/routes/__tests__/tasks.test.ts
```

Expected: New export tests should pass (once vitest aliases are fixed)

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/__tests__/tasks.test.ts
git commit -m "test: add export route tests"
```

---

## Spec Coverage Check

| Requirement | Task | Status |
|-------------|------|--------|
| Backend export endpoint | Task 2 | Covered |
| JSON format support | Task 1 | Covered |
| CSV format support | Task 1 | Covered |
| XML format support | Task 1 | Covered |
| Format query parameter | Task 2 | Covered |
| Download filename header | Task 2 | Covered |
| Error handling (not found, not completed) | Task 2, 4 | Covered |
| Authorization checks | Task 2 | Covered |

**No gaps found.**

---

## Placeholder Scan

- [x] No "TBD", "TODO", "implement later"
- [x] No vague error handling references
- [x] No "write tests for the above"
- [x] All types/functions defined before use
- [x] Exact file paths in every step

---

## Execution Handoff

**Plan complete.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
