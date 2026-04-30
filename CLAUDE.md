# AstroDigest

## What This Is

Weekly astronomy digest app. An AI-powered pipeline ingests papers and news
from arXiv, NASA, ESO, ALMA, and SpaceX, summarizes them with Claude, and
delivers a curated weekly digest via push notification to a React Native app.

## Monorepo Structure

- apps/mobile → React Native + Expo (Expo Router, Zustand, Clerk auth)
- apps/api → Fastify + TypeScript REST API, hosted on Railway
- packages/workers → BullMQ workers: scoring, summarization, assembly, delivery
- packages/ingestion → Cloudflare Workers: RSS and API fetching from all sources
- packages/database → Kysely query client, migrations, shared DB types
- packages/shared → TypeScript types shared across all packages

## Tech Stack

- Language: TypeScript strict mode throughout, no any types allowed
- Database: Neon (Postgres) accessed via Kysely query builder
- Queue: BullMQ backed by Upstash Redis
- API: Fastify (not Express)
- Auth: Clerk
- Mobile: React Native + Expo
- AI: Anthropic API direct — claude-haiku-4-5 for quick hits, claude-sonnet-4-6 for big story
- Ingestion: Cloudflare Workers on a daily cron
- Hosting: Railway for API and workers, Cloudflare Workers for ingestion

## Coding Conventions

- All async functions must have explicit return types
- All errors must be logged with Pino before being thrown or rethrown
- Database access only through Kysely — never raw SQL strings in application code
- Migrations are raw SQL files: up migrations in packages/database/migrations/, rollback SQL in packages/database/migrations/rollback/; rollbacks run via packages/database/scripts/rollback.mjs (not node-pg-migrate down)
- Every BullMQ worker job must have a try/catch that marks the job failed on error
- Commit messages: imperative mood, under 72 characters
- Never commit .env — only .env.example gets committed

## Dev Commands

- npm run dev → start API and workers locally
- npm run migrate → run pending migrations against Neon
- npm run migrate:rollback → rollback last migration
- npm run lint → ESLint across all packages via Turbo
- npm run typecheck → TypeScript check across all packages via Turbo
- npm test → run all tests

## Environment Variables

See .env.example in root for all required keys.
Required for Phase 1+2: NEON_DATABASE_URL, UPSTASH_REDIS_URL,
UPSTASH_REDIS_TOKEN, ANTHROPIC_API_KEY, NASA_API_KEY
