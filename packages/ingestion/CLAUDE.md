# @astrodigest/ingestion

Cloudflare Workers that run on a daily cron to fetch and normalise content from external astronomy sources: arXiv (papers), NASA (news and APOD), ESO (press releases), ALMA (announcements), and SpaceX (updates). Each source has its own fetcher that parses RSS feeds or REST APIs and writes normalised records into the database via `@astrodigest/database`. Runs entirely on Cloudflare's edge — no Railway dependency.

## Conventions

- Each source has its own fetcher file under `src/fetchers/` exporting a single async function
- Fetchers must be idempotent — use upsert logic so re-runs don't create duplicate records
- Normalise all content to the shared `RawArticle` type from `@astrodigest/shared` before writing
- Never enqueue BullMQ jobs directly — write to the database only; the scoring worker polls for new records
- Log fetch errors per-source and continue — one failing source must not abort the entire cron run
