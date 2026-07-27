import { db } from '@astrodigest/database'
import { ingestionQueue } from './queues.js'
import { logger } from './logger.js'
import type { IngestionJob } from './queues.js'

const POLL_INTERVAL_MS = 5 * 60 * 1000
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

      // Mark queued immediately so the next poll (5 min later) doesn't
      // re-enqueue the same row while scoring is still in flight.
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
  logger.info({ intervalMs: POLL_INTERVAL_MS }, '[poller] starting raw_content poller')

  pollOnce().catch((err: unknown) => logger.error({ err }, '[poller] initial poll failed'))

  return setInterval(() => {
    pollOnce().catch((err: unknown) => logger.error({ err }, '[poller] poll failed'))
  }, POLL_INTERVAL_MS)
}
