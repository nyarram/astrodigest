# @astrodigest/digest-assembly

Assembles the weekly digest from already-scored, already-summarized content — picks the big story, image of week, paper deep dive, quick hits, and space news from `processed_content`/`raw_content`, inserts one row into `digests`, and enqueues a delayed BullMQ delivery job. It is a one-shot script (`node dist/index.js`), not a long-running BullMQ worker: it runs to completion and exits. Invoked on the VPS by the `deploy` user's crontab, Fridays 20:00 UTC (`docker compose --profile cron run --rm digest-assembly`), not via `docker compose up`. Deployed by `.github/workflows/deploy-vps.yml` alongside `api`/`workers`, but never run by that workflow — only its image gets rebuilt.

## Conventions

- One digest per calendar week — `assemble()` checks for an existing row with the same `week_start` and skips (not an error) if one exists
- Selection steps that may legitimately have nothing to pick for a given week (`imageOfWeek`, `paperDeepDive`) must soft-fail to `null` and log a warning — never throw, since one thin section shouldn't block the whole digest. Only a total absence of any eligible content (`bigStory`) is a hard failure.
- All Sentry spans/measurements go through `Sentry.startSpan` — see `assembler.ts` for the pattern
- Every DB and Redis call is wrapped in try/catch, logged with Pino, then rethrown
