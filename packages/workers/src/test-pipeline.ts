import { neon } from '@neondatabase/serverless'
import { db } from '@astrodigest/database'
import {
  ingestionQueue,
  bullmqConnection,
  ingestionQueue as iq,
  scoringQueue,
  summarizationQueue,
  editorialQueue,
  deliveryQueue,
} from './queues.js'
import { scoringWorker } from './workers/scoring.worker.js'
import { summarizationWorker } from './workers/summarization.worker.js'
import { editorialWorker } from './workers/editorial.worker.js'
import { logger } from './logger.js'
import type { IngestionJob } from './queues.js'

// ---------------------------------------------------------------------------
// Test items
// ---------------------------------------------------------------------------

const TEST_ITEMS = [
  {
    source: 'arxiv',
    source_id: 'test-001',
    title: 'Bremsstrahlung emission from nuclear reactions in compact stars',
    abstract:
      'We study bremsstrahlung emission processes in dense nuclear matter relevant to neutron star cooling.',
    url: 'https://arxiv.org/abs/test-001',
  },
  {
    source: 'nasa',
    source_id: 'test-002',
    title: 'Giant Cluster Bends, Breaks Images',
    abstract:
      'Galaxy clusters can contain thousands of galaxies and have enough gravity to act as gravitational lenses.',
    url: 'https://www.nasa.gov/test-002',
  },
  {
    source: 'eso',
    source_id: 'test-003',
    title: 'Largest image of its kind shows hidden chemistry at the heart of the Milky Way',
    abstract:
      'ALMA has produced the largest image of the Milky Way galactic center, revealing cold molecular gas filaments in unprecedented detail.',
    url: 'https://www.eso.org/test-003',
  },
]

async function main(): Promise<void> {
  const connectionString = process.env['NEON_DATABASE_URL']
  if (!connectionString) {
    throw new Error('Missing required environment variable: NEON_DATABASE_URL')
  }

  const sql = neon(connectionString)

  // -------------------------------------------------------------------------
  // 1. Insert test items into raw_content
  // -------------------------------------------------------------------------

  logger.info('Inserting test items into raw_content...')

  const insertedIds: string[] = []

  for (const item of TEST_ITEMS) {
    // Delete any leftover from a previous test run so source_id stays unique
    await sql`DELETE FROM raw_content WHERE source_id = ${item.source_id}`

    const rows = await sql`
      INSERT INTO raw_content (source, source_id, title, abstract, url)
      VALUES (${item.source}, ${item.source_id}, ${item.title}, ${item.abstract}, ${item.url})
      RETURNING id
    `
    const id = rows[0]?.id as string
    insertedIds.push(id)
    logger.info(`  Inserted [${item.source}] "${item.title.slice(0, 50)}" → id: ${id}`)
  }

  // -------------------------------------------------------------------------
  // 2. Enqueue all 3 to ingestion-queue
  // -------------------------------------------------------------------------

  logger.info('Enqueueing items to ingestion-queue...')

  for (let i = 0; i < TEST_ITEMS.length; i++) {
    const item = TEST_ITEMS[i]
    const rawContentId = insertedIds[i]
    if (!item || !rawContentId) continue

    const payload: IngestionJob = {
      rawContentId,
      source: item.source,
      title: item.title,
      abstract: item.abstract,
      url: item.url,
    }
    await ingestionQueue.add('score', payload)
    logger.info(`  Enqueued "${item.title.slice(0, 50)}"`)
  }

  // -------------------------------------------------------------------------
  // 3. Workers are already started (imported above). Set concurrency.
  // -------------------------------------------------------------------------

  scoringWorker.concurrency = 2
  summarizationWorker.concurrency = 2
  editorialWorker.concurrency = 2

  logger.info('Workers running. Waiting 60 seconds for pipeline to complete...')

  // -------------------------------------------------------------------------
  // 4. Wait 60 seconds
  // -------------------------------------------------------------------------

  await new Promise<void>((resolve) => setTimeout(resolve, 60_000))

  // -------------------------------------------------------------------------
  // 5. Query results
  // -------------------------------------------------------------------------

  logger.info('\n--- Pipeline Results ---\n')

  const results = await db
    .selectFrom('processed_content as pc')
    .innerJoin('raw_content as rc', 'rc.id', 'pc.raw_content_id')
    .select([
      'rc.title',
      'rc.status',
      'pc.model_used',
      'pc.confidence_score',
      'pc.flagged',
      'pc.summary_short',
    ])
    .where('rc.source_id', 'in', ['test-001', 'test-002', 'test-003'])
    .execute()

  if (results.length === 0) {
    logger.warn('No processed_content rows found — pipeline may not have completed in time.')
  }

  for (const row of results) {
    console.log('─'.repeat(60))
    console.log(`Title:       ${row.title}`)
    console.log(`Status:      ${row.status}`)
    console.log(`Model:       ${row.model_used ?? 'N/A'}`)
    console.log(`Confidence:  ${row.confidence_score?.toFixed(2) ?? 'N/A'}`)
    console.log(`Flagged:     ${row.flagged}`)
    console.log(`Summary:     ${(row.summary_short ?? '').slice(0, 200)}`)
    console.log()
  }

  // Also print any items that didn't make it to processed_content
  const rawRows = await db
    .selectFrom('raw_content')
    .select(['source_id', 'title', 'status', 'relevance_score'])
    .where('source_id', 'in', ['test-001', 'test-002', 'test-003'])
    .execute()

  const processedSourceIds = new Set(
    results.map((r) => {
      const item = TEST_ITEMS.find((t) => t.title === r.title)
      return item?.source_id
    }),
  )

  for (const raw of rawRows) {
    if (!processedSourceIds.has(raw.source_id)) {
      console.log('─'.repeat(60))
      console.log(`Title:        ${raw.title}`)
      console.log(`Raw status:   ${raw.status} (did not reach processed_content)`)
      console.log(`Relevance:    ${raw.relevance_score ?? 'not scored'}`)
      console.log()
    }
  }

  // -------------------------------------------------------------------------
  // 6. Shutdown
  // -------------------------------------------------------------------------

  logger.info('Shutting down...')

  const workers = [scoringWorker, summarizationWorker, editorialWorker]
  const queues = [iq, scoringQueue, summarizationQueue, editorialQueue, deliveryQueue]

  await Promise.all(workers.map((w) => w.close()))
  await Promise.all(queues.map((q) => q.close()))
  await bullmqConnection.quit()

  logger.info('Done.')
  process.exit(0)
}

main().catch((err) => {
  logger.error({ err }, 'test-pipeline failed')
  process.exit(1)
})
