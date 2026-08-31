# @astrodigest/workers

BullMQ worker processes that consume jobs from Redis queues (self-hosted Redis container, see root `docker-compose.yml`). Responsible for four pipeline stages: scoring (ranking ingested content by relevance), summarization (calling the Groq API to generate article summaries), editorial (automated quality checks that flag bad summaries before they're eligible for a digest), and delivery (sending push notifications via Expo). Weekly digest assembly is a separate package, `@astrodigest/digest-assembly`, not run here. Hosted on the self-hosted VPS (Docker Compose) alongside the API.

## Conventions

- Each worker is a separate file under `src/workers/` and registers exactly one BullMQ `Worker`
- Every job processor must be wrapped in try/catch — call `job.moveToFailed()` on error after logging with Pino
- Never access the database with raw SQL — use the Kysely client from `@astrodigest/database`
- Use the `claude-haiku-4-5`/`claude-sonnet-4-6` model names as internal aliases — both map to Groq's `openai/gpt-oss-120b` via `toGroqModel()`; `claude-haiku-4-5` selects the per-article summary prompt, `claude-sonnet-4-6` selects the higher-scored (big-story-style) prompt
- All Groq API calls must have explicit `max_tokens` set
- The `raw_content` poller (`poller.ts`) runs hourly by default. Do not shorten it in production: every poll queries Neon and resets its autosuspend timer, and a short interval keeps the Free-plan compute awake around the clock, exhausting the monthly compute-hour allowance. Use `RAW_CONTENT_POLL_INTERVAL_MS` for a faster local loop. Neon's own autosuspend should also be set to 60s in the console.
