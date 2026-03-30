# Better-Auth Documentation Notes

## Core Concepts

### Password Hashing
- **Default Algorithm**: `scrypt` (Node.js native)
- **NOT bcrypt** - seed script using bcrypt will fail password verification
- Custom hash/verify functions can be provided via `emailAndPassword.password.hash`

### Database Schema (Core Tables)
1. **user** - id, name, email, emailVerified, image, createdAt, updatedAt
2. **session** - id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId
3. **account** - id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt
   - For email/password: `providerId = "credential"`, password stored here
4. **verification** - id, identifier, value, expiresAt, createdAt, updatedAt

### API Endpoints (relative to basePath `/api/auth`)
- `POST /sign-in/email` - Sign in with email/password
- `POST /sign-up/email` - Sign up new user
- `POST /sign-out` - Sign out
- `GET /get-session` - Get current session
- `GET /csrf` - Get CSRF token
- `POST /change-password` - Change password

### Client Setup
```typescript
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
})
```

### Server Handler (Hono/Cloudflare Workers)
```typescript
app.on(['POST', 'GET'], '/api/auth/**', c => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});
```

### Drizzle Adapter
```typescript
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
})
```

### Programmatic Migrations (for Cloudflare Workers)
```typescript
import { getMigrations } from 'better-auth/db/migration'
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)
```

## Common Issues

### 500 on sign-in
- **Cause**: Password hash mismatch (seed uses bcrypt, better-auth expects scrypt)
- **Fix**: Create users via sign-up API, not direct DB insert

### Database sync (IMPORTANT)
- `wrangler dev` uses local D1 at `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
- NOT the same as `dev.sqlite` used by drizzle-kit
- Schema must be pushed to wrangler's D1 via: `wrangler d1 execute <name> --local --file <migration.sql>`
- Seed data must also be inserted into wrangler's D1

### Password Requirements
- Minimum 8 characters required by default
- Uses scrypt hashing (not bcrypt)

## CLI Commands
```bash
npx auth@latest generate   # Generate schema
npx auth@latest migrate    # Run migrations
```

## Wrangler D1 Commands
```bash
# Push schema to wrangler local D1
./node_modules/.bin/wrangler d1 execute invoice-recognizer --local --yes --file ./drizzle/0000_furry_speed_demon.sql

# Check tables
./node_modules/.bin/wrangler d1 execute invoice-recognizer --local --yes --command "SELECT name FROM sqlite_master WHERE type='table'"

# Insert data (e.g., credit_wallet)
./node_modules/.bin/wrangler d1 execute invoice-recognizer --local --yes --command "INSERT INTO credit_wallet ..."
```
