# @astrodigest/workers

BullMQ worker processes that consume jobs from Upstash Redis queues. Responsible for the four core pipeline stages: scoring (ranking ingested content by relevance), summarization (calling the Anthropic API to generate article summaries), assembly (composing the weekly digest from top-scored content), and delivery (sending push notifications via Expo). Hosted on Railway alongside the API.

## Conventions

- Each worker is a separate file under `src/workers/` and registers exactly one BullMQ `Worker`
- Every job processor must be wrapped in try/catch — call `job.moveToFailed()` on error after logging with Pino
- Never access the database with raw SQL — use the Kysely client from `@astrodigest/database`
- Use `claude-haiku-4-5` for per-article summarization, `claude-sonnet-4-6` for big-story assembly
- All Anthropic API calls must have explicit `max_tokens` set
