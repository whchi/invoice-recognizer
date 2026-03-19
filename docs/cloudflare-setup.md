# Cloudflare Provisioning Guide

This guide covers the manual setup and provisioning steps for the Cloudflare resources required for the Invoice Recognizer MVP.

## Prerequisites

- Install `wrangler` CLI: `npm install -g wrangler`
- Authenticate with Cloudflare: `wrangler login`

## D1 Database

Create the D1 database instance:

```bash
wrangler d1 create invoice-recognizer-db
```

After creation, copy the `database_id` to your `wrangler.toml`.

**Binding name:** `DB`

## R2 Bucket

Create the R2 bucket for invoice storage:

```bash
wrangler r2 bucket create invoice-recognizer-r2
```

**Binding name:** `R2_BUCKET`

## R2 Lifecycle Rule

Apply a lifecycle rule to automatically expire temporary files in the `tmp/` prefix after 1 day.

```bash
wrangler r2 bucket lifecycle add invoice-recognizer-r2 --prefix tmp/ --expire-days 1
```

## Queue

Create the queue for asynchronous invoice processing:

```bash
wrangler queues create invoice-tasks
```

**Binding name:** `TASK_QUEUE` (producer and consumer are handled by the same worker)

## KV Namespace

Create the KV namespace for rate limiting:

```bash
wrangler kv namespace create RATE_LIMIT
```

After creation, copy the `id` to your `wrangler.toml`.

**Binding name:** `RATE_LIMIT`

## Secrets

Set the following secrets using the `wrangler secret put` command:

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
```

## Local Development

To run the application locally with these bindings:

```bash
wrangler dev
```

Note that for remote D1 access during local development, ensure the `database_id` is correctly set in `wrangler.toml`. Local development can also use `--local` for a persistence-free local database.

## Verification

Confirm all resources are wired up:

- [ ] D1 is created and `database_id` is in `wrangler.toml`
- [ ] R2 is created and bound to `R2_BUCKET`
- [ ] R2 lifecycle rule for `tmp/` is applied
- [ ] Queue `invoice-tasks` is created and bound to `TASK_QUEUE`
- [ ] KV namespace `RATE_LIMIT` is created and `id` is in `wrangler.toml`
- [ ] All 4 secrets have been put via `wrangler secret put`
