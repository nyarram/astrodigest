# @astrodigest/api

Fastify REST API server that acts as the backend for the AstroDigest mobile app. It handles authentication via Clerk, serves digest and article endpoints to the mobile client, and enqueues jobs onto BullMQ queues for the workers package to process. Hosted on Railway. All routes are typed end-to-end using shared types from `@astrodigest/shared`, and all database access goes through the Kysely client exported from `@astrodigest/database`.

## Conventions

- Register all routes as Fastify plugins under `src/routes/`
- Use Fastify's built-in schema validation (JSON Schema) on every route — no unvalidated inputs
- All route handlers must be `async` with explicit return types
- Log all errors with the Pino logger instance before throwing
- Never import from `packages/workers` or `packages/ingestion` — only `shared` and `database`
