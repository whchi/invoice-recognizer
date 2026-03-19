You have a pre-skill: `prompt-translator`

Whenever the user provides any input, please follow this process:

First, call the `prompt-translator` skill and pass the user's original input in full.

Receive the returned pure English version.

Use this pure English version as the prompt for all subsequent thinking and execution.

# AGENTS.md — invoice-recognizer
## Architecture

Hono.js backend on Cloudflare Workers with React SPA frontend. Backend uses D1 (SQLite), R2 (object storage), Queues (async task processing), and KV (rate limiting). Auth via Better Auth with cookie-based sessions (Email/Password + Google OAuth). ORM is Drizzle. Frontend UI uses React with shadcn/ui (new-york style), Tailwind CSS v4, and TanStack Router for file-based routing.

```
worker.ts              → Main Cloudflare Worker entry (fetch + queue handler)
backend/src/
  ├── index.ts         → Hono app initialization & route registration
  ├── db/              → Drizzle schema & DB client
  │   └── schema/      → Domain-specific schemas (*.ts files)
  ├── lib/             → Business logic (one folder per domain)
  ├── middleware/      → Auth & DB middleware
  └── routes/         → Hono route handlers
frontend/src/
  ├── routes/          → TanStack Router file-based routes
  ├── components/       → React components (shadcn/ui in components/ui/)
  └── lib/             → Frontend utilities & API client
dist/client/           → Frontend build output (served by wrangler [assets])
```

## Commands

### Development
```bash
npm run dev              # Start both frontend (5173) + backend (8787)
npm run dev:frontend     # Frontend only (Vite, port 5173)
npm run preview          # Build + wrangler dev (local Cloudflare preview)
```

### Build & Deploy
```bash
npm run build            # Production build (type-checks included)
npm run build:frontend   # Build frontend → dist/client/
npm run deploy           # Build + wrangler deploy (production)
```

### Testing
```bash
npm test                 # Vitest unit tests (watch mode)
npm test -- --run        # Vitest single run (CI-friendly)
npm run test:e2e         # Playwright e2e tests
npm run test:build       # Tests then build
npm run smoke            # Smoke test against local dev
```

### Running a single test
```bash
npx vitest src/lib/tasks/__tests__/tasks.test.ts    # single file
npx vitest --run -t "returns disclaimer_required"   # single test by name
npx vitest --run src/lib/credits                    # all tests in folder
```

### Database
```bash
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Run pending migrations against D1
npx drizzle-kit push        # Push schema directly to D1 (dev only)
npm run db:seed            # Seed database with test data
```

### Linting & Formatting
```bash
npm run lint              # ESLint (currently empty ruleset)
npm run format            # Biome format --write
```

## Code Style

### Formatting (Biome)
Ground truth is `biome.jsonc`:
- **Semicolons**: always
- **Quotes**: single quotes
- **Trailing commas**: all
- **Indentation**: 2 spaces
- **Line width**: 120 characters

### Imports
1. External packages first (`hono`, `drizzle-orm`, `react`)
2. Internal imports second, using path aliases
3. Use `import type` for type-only imports
4. Named imports only — no default imports

Path aliases:
- `@backend/*` maps to `backend/src/*`
- `@frontend/*` maps to `frontend/src/*`

```ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Db } from '@backend/db';
import { tasks } from '@backend/db/schema';
```

### Naming
| What           | Convention       | Example                             |
| -------------- | ---------------- | ----------------------------------- |
| Files (lib)    | kebab-case       | `validate.ts`, `presign.ts`        |
| Functions      | camelCase        | `createTask`, `authenticateRequest`|
| Types          | PascalCase       | `CreateTaskResult`, `WalletInfo`   |
| Constants      | UPPER_SNAKE_CASE | `MAX_UPLOAD_BYTES`                  |
| DB tables/cols | snake_case       | `text('user_id')`                  |

### TypeScript
- Strict mode — no `as any`, `@ts-ignore`, `@ts-expect-error`
- Prefer `type` over `interface` for unions/simple objects
- Use `interface` only for contracts that may be extended
- Explicit return types on exported async functions

### Error Handling — Result Pattern
Business logic returns discriminated unions, never throws:

```ts
type CreateTaskResult =
  | { ok: true; task: { id: string; status: string } }
  | { ok: false; error: 'invalid_template' | 'disclaimer_required' }
```

Hono routes map Result errors to HTTP status codes. Use `try/catch` only for `c.req.json()` parsing and external I/O.

### Hono Routes
```ts
export const tasks = new Hono<{ Bindings: Bindings; Variables: Variables }>();

tasks.post('/', authenticateMiddleware, async (c) => {
  const db = c.get('db');
  const { ok, error, task } = await createTask(db, c.req);
  if (!ok) return c.json({ error }, 400);
  return c.json(task, 201);
});
```

### Database (Drizzle + D1)
- Schema in `backend/src/db/schema/*.ts`
- Single-row fetches: `const [row] = await db.select()...where(eq(...)).limit(1)`
- Atomic ops: `db.batch([...])` (D1 has no transactions)
- IDs: ULID strings via `ulid()`
- Timestamps: `integer` columns with `{ mode: 'timestamp' }`

### Tests (Vitest)
- Location: `backend/src/lib/<domain>/__tests__/*.test.ts` or `backend/src/routes/__tests__/*.test.ts`
- Mock D1 with `createMockDb()` factory
- Mock `ulid` and `crypto.getRandomValues` for deterministic output
- Import explicitly: `import { describe, it, expect, vi } from 'vitest'`

### Cloudflare Bindings
```
DB          → D1Database     (SQLite)
R2_BUCKET   → R2Bucket       (object storage)
TASK_QUEUE  → Queue          (async jobs)
RATE_LIMIT  → KVNamespace    (guest rate limiting)
```

### Comments
Avoid comments. Make code self-documenting through naming. Acceptable:
- Data format clarification (`// YYYY-MM-DD`)
- Type enum values (`// queued | processing | completed | failed`)
- Regex patterns
- Security/performance rationale
