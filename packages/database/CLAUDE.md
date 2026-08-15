# @astrodigest/database

Exports the Kysely query client configured for Neon (serverless Postgres), the full generated database type map, and migration utilities. All other packages import their database access from here — no package should open its own connection or write raw SQL. Migrations are plain SQL files under `migrations/`, applied via `npm run migrate --workspace=@astrodigest/database`.

## Conventions

- Never use raw SQL template strings in application code — always use the Kysely query builder
- Migration files are named `NNN_description.sql` (zero-padded, e.g. `001_users.sql`) under `migrations/`
- Rollback files live in `migrations/rollback/`, named `NNN_description.down.sql` — run via `npm run migrate:rollback --workspace=@astrodigest/database` (`packages/database/scripts/rollback.mjs`), not `node-pg-migrate down`
- Export all table row types from `src/types.ts` — other packages import types from here, not from Kysely internals
- The Kysely client instance is a singleton exported from `src/client.ts`
