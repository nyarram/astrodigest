# @astrodigest/database

Exports the Kysely query client configured for Neon (serverless Postgres), the full generated database type map, and migration utilities. All other packages import their database access from here — no package should open its own connection or write raw SQL. Migrations are plain SQL files under `migrations/` and are applied via a small Node script (`npm run migrate` from the root).

## Conventions

- Never use raw SQL template strings in application code — always use the Kysely query builder
- Migration files are named `NNNN_description.sql` (zero-padded, e.g. `0001_create_articles.sql`)
- Rollback files must exist for every migration: `NNNN_description.down.sql`
- Export all table row types from `src/types.ts` — other packages import types from here, not from Kysely internals
- The Kysely client instance is a singleton exported from `src/db.ts`
