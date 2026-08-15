# AstroDigest

## What This Is

Weekly astronomy digest app. An AI-powered pipeline ingests papers and news
from arXiv, NASA APOD, ESO, ALMA, NASASpaceflight, and SpaceX, summarizes them
with Groq (openai/gpt-oss-120b), and delivers a curated weekly digest via
push notification to a React Native app and a Next.js web app.

## Monorepo Structure

- apps/web → Next.js 15 frontend (Vercel), Clerk auth, TanStack Query
- apps/mobile → React Native + Expo (Expo Router, Zustand, Clerk auth)
- apps/api → Fastify + TypeScript REST API
- packages/workers → BullMQ workers: scoring, summarization, editorial (quality checks), delivery
- packages/digest-assembly → assembles the weekly digest from top-scored content; runs on-demand via cron, not a BullMQ worker
- packages/ingestion → Cloudflare Workers: RSS and API fetching from all sources
- packages/database → Kysely query client, migrations, shared DB types
- packages/shared → TypeScript types shared across all packages

## Tech Stack

- Language: TypeScript strict mode throughout, no any types allowed
- Database: Neon (Postgres) accessed via Kysely query builder
- Queue: BullMQ backed by self-hosted Redis (Docker container on the VPS, see root docker-compose.yml)
- API: Fastify (not Express)
- Auth: Clerk
- Mobile: React Native + Expo
- AI: Groq API (openai/gpt-oss-120b) for all summarization — free tier, weekly batch
- Ingestion: Cloudflare Workers on a daily cron
- Hosting: Vercel (web), self-hosted VPS via Docker Compose (api, workers, digest-assembly), Cloudflare Workers (ingestion)

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
- npm run migrate --workspace=@astrodigest/database → run pending migrations against Neon
- npm run migrate:rollback --workspace=@astrodigest/database → rollback last migration
- npm run lint → ESLint across all packages via Turbo
- npm run typecheck → TypeScript check across all packages via Turbo
- npm test --workspace=@astrodigest/digest-assembly → run its vitest suite (currently the only package with tests)

## Deployment

- apps/web deploys to Vercel automatically via its GitHub integration on every merge to main
- api, workers, and digest-assembly deploy to the self-hosted VPS automatically via
  .github/workflows/deploy-vps.yml on every merge to main (rsync + docker compose build/up)
- digest-assembly itself is never run by the deploy workflow — it stays on-demand via
  the deploy user's crontab on the VPS (Fridays 20:00 UTC), so a deploy only updates
  the image it runs next

## Environment Variables

See .env.example in root for all required keys.
Required: NEON_DATABASE_URL, REDIS_URL, GROQ_API_KEY, NASA_API_KEY
