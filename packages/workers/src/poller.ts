import { db } from '@astrodigest/database'
import { ingestionQueue } from './queues.js'
import { logger } from './logger.js'
import type { IngestionJob } from './queues.js'

// Content is ingested by a once-daily Cloudflare cron and the digest is
// weekly, so the pipeline has no need for sub-hour latency. A short interval
// here is actively harmful: every poll issues a query that resets Neon's
// scale-to-zero timer (fixed at 5 min on the Free plan, not adjustable), and
// a 5-minute poll kept the compute awake 24/7, exhausting the monthly
// compute-hour allowance. An hourly poll leaves ~55 min for the compute to
// suspend. Override for local dev via `RAW_CONTENT_POLL_INTERVAL_MS`.
const DEFAULT_POLL_INTERVAL_MS = 60 * 60 * 1000

function resolvePollIntervalMs(): number {
  const raw = process.env['RAW_CONTENT_POLL_INTERVAL_MS']
  if (raw === undefined || raw === '') return DEFAULT_POLL_INTERVAL_MS

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      { value: raw },
      '[poller] invalid RAW_CONTENT_POLL_INTERVAL_MS, falling back to default',
    )
    return DEFAULT_POLL_INTERVAL_MS
  }
  return parsed
}

const BATCH_SIZE = 50

// Bridges Cloudflare ingestion (writes raw_content only, per its own convention)
// to the BullMQ pipeline (scoring worker consumes ingestion-queue, not the DB).
async function pollOnce(): Promise<void> {
  const rows = await db
    .selectFrom('raw_content')
    .select(['id', 'source', 'title', 'abstract', 'url'])
    .where('status', '=', 'pending')
    .limit(BATCH_SIZE)
    .execute()

  if (rows.length === 0) return

  logger.info({ count: rows.length }, '[poller] found pending raw_content rows')

  for (const row of rows) {
    try {
      const payload: IngestionJob = {
        rawContentId: row.id,
        source: row.source,
        title: row.title,
        abstract: row.abstract,
        url: row.url,
      }
      await ingestionQueue.add('score', payload)

      // Mark queued immediately so the next poll doesn't re-enqueue the
      // same row while scoring is still in flight.
      await db
        .updateTable('raw_content')
        .set({ status: 'queued' })
        .where('id', '=', row.id)
        .execute()
    } catch (err) {
      logger.error({ err, rawContentId: row.id }, '[poller] failed to enqueue row')
    }
  }
}

export function startRawContentPoller(): NodeJS.Timeout {
  const intervalMs = resolvePollIntervalMs()
  logger.info({ intervalMs }, '[poller] starting raw_content poller')

  pollOnce().catch((err: unknown) => logger.error({ err }, '[poller] initial poll failed'))

  return setInterval(() => {
    pollOnce().catch((err: unknown) => logger.error({ err }, '[poller] poll failed'))
  }, intervalMs)
}
