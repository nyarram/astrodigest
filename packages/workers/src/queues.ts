import { Queue } from 'bullmq'
import IORedis from 'ioredis'

function resolveConnectionUrl(): string {
  const url = process.env['REDIS_URL']
  if (!url) {
    throw new Error('Missing required environment variable: REDIS_URL')
  }
  return url
}

const connectionUrl = resolveConnectionUrl()

export const bullmqConnection = new IORedis(connectionUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
}

// Local, same-host Redis — no need for BullMQ's default sub-5-second idle
// polling. A weekly-batch pipeline doesn't need sub-minute latency, and the
// default drainDelay/stalledInterval combo is what drove Upstash's
// pay-per-command free tier to exhaustion in the old setup.
export const defaultWorkerOptions = {
  drainDelay: 30, // seconds between blocking-pop retries while idle
  stalledInterval: 120_000, // ms between stalled-job checks
}

export const ingestionQueue = new Queue('ingestion-queue', {
  connection: bullmqConnection,
  defaultJobOptions,
})

export const scoringQueue = new Queue('scoring-queue', {
  connection: bullmqConnection,
  defaultJobOptions,
})

export const summarizationQueue = new Queue('summarization-queue', {
  connection: bullmqConnection,
  defaultJobOptions,
})

export const editorialQueue = new Queue('editorial-queue', {
  connection: bullmqConnection,
  defaultJobOptions,
})

export const deliveryQueue = new Queue('delivery-queue', {
  connection: bullmqConnection,
  defaultJobOptions,
})

// ---------------------------------------------------------------------------
// Job payload interfaces
// ---------------------------------------------------------------------------

export interface IngestionJob {
  rawContentId: string
  source: string
  title: string
  abstract: string | null
  url: string
  relevanceScore?: number
}

export interface SummarizationJob extends IngestionJob {
  model: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
}

export interface EditorialJob {
  rawContentId: string
  processedContentId: string
}

export interface DeliveryJob {
  digestId: string
  /** ISO-8601 string — when the push notification should fire. Set by digest-assembly. */
  scheduledFor: string
}
