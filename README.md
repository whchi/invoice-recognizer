# Invoice Recognizer

AI-powered invoice data extraction API with React frontend.

## Tech Stack

- **Backend**: Hono.js on Cloudflare Workers (D1, R2, Queues, KV)
- **Frontend**: React + TanStack Router + Tailwind CSS v4 + shadcn/ui
- **Auth**: Better Auth (Email/Password + Google OAuth)
- **Database**: Drizzle ORM + SQLite (D1)
- **Storage**: Cloudflare R2

## Development Setup

```bash
# 1. Create empty dist/client for wrangler assets
mkdir -p dist/client

# 2. Install dependencies
npm install

# 3. Run database migrations
npm run db:migrate

# 4. Seed development data (optional)
npm run db:seed
```

### Starting Dev Server

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8787
- API Docs: http://localhost:8787/docs

### Test Accounts

After running `npm run db:seed`:

| Email              | Password | Role                 |
| ------------------ | -------- | -------------------- |
| `admin@example.cc` | `Aa1234` | Admin (1000 credits) |
| `user1@example.cc` | —        | Test user            |
| `user2@example.cc` | —        | Test user            |

## Commands

### Development
```bash
npm run dev              # Start both frontend + backend
npm run dev:frontend     # Frontend only (port 5173)
npm run preview          # Build + wrangler dev
```

### Build & Deploy
```bash
npm run build            # Production build (type-checks included)
npm run build:frontend   # Build frontend → dist/client/
npm run deploy           # Build + deploy to Cloudflare
```

### Testing
```bash
npm test                 # Vitest unit tests (watch mode)
npm test -- --run        # Vitest single run (CI-friendly)
npm run test:e2e         # Playwright e2e tests
```

### Running a single test
```bash
npx vitest src/lib/tasks/__tests__/tasks.test.ts    # single file
npx vitest --run -t "returns disclaimer_required"   # single test by name
```

### Database
```bash
npm run db:seed          # Seed dev data
npm run db:migrate       # Run migrations
npx drizzle-kit generate # Generate migration from schema changes
npx drizzle-kit push     # Push schema directly to D1 (dev only)
```

### Linting & Formatting
```bash
npm run lint             # ESLint
npm run format           # Biome format --write
```

## Project Structure

```
worker.ts              → Cloudflare Worker entry (fetch + queue handler)
backend/src/
  ├── index.ts         → Hono app initialization & route registration
  ├── db/              → Drizzle schema & DB client
  │   └── schema/      → Domain-specific schemas (*.ts files)
  ├── lib/             → Business logic (one folder per domain)
  ├── middleware/      → Auth & DB middleware
  └── routes/          → Hono route handlers
frontend/src/
  ├── routes/          → TanStack Router file-based routes
  ├── components/      → React components (shadcn/ui in components/ui/)
  └── lib/             → Frontend utilities & API client
dist/client/           → Frontend build output (served by wrangler [assets])
```

## Environment Variables (Production)

Required in Cloudflare dashboard:
- `BETTER_AUTH_SECRET` — Better Auth secret
- `BETTER_AUTH_URL` — Production URL (e.g. https://your-domain.com)
- `GOOGLE_CLIENT_ID` — Google OAuth
- `GOOGLE_CLIENT_SECRET` — Google OAuth
- `R2_ACCESS_KEY_ID` — R2 credentials
- `R2_SECRET_ACCESS_KEY` — R2 credentials
- `R2_S3_ENDPOINT` — R2 endpoint
- `R2_BUCKET_NAME` — R2 bucket name
- `GEMINI_API_KEY` — Google Gemini for OCR
- `ADMIN_SECRET` — Admin API access
