import { scoringWorker } from './workers/scoring.worker.js'
import { summarizationWorker } from './workers/summarization.worker.js'
import { editorialWorker } from './workers/editorial.worker.js'
import {
  bullmqConnection,
  ingestionQueue,
  scoringQueue,
  summarizationQueue,
  editorialQueue,
  deliveryQueue,
} from './queues.js'
import { logger } from './logger.js'

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

scoringWorker.concurrency = 2
summarizationWorker.concurrency = 2
editorialWorker.concurrency = 2

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

const workers = [scoringWorker, summarizationWorker, editorialWorker] as const

for (const worker of workers) {
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, 'job failed')
  })
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

logger.info('AstroDigest workers started')

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const queues = [ingestionQueue, scoringQueue, summarizationQueue, editorialQueue, deliveryQueue]

async function shutdown(): Promise<void> {
  logger.info('Shutting down workers...')

  await Promise.all(workers.map((w) => w.close()))
  await Promise.all(queues.map((q) => q.close()))
  await bullmqConnection.quit()

  logger.info('Workers shut down gracefully')
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
