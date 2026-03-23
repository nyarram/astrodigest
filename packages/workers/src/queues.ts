import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// BullMQ requires an ioredis TCP connection (rediss://).
// This is separate from the @upstash/redis REST client in redis.ts.
//
// Prefer an explicit UPSTASH_REDIS_CONNECTION_URL (rediss://<host>:6379).
// If absent, derive it from the REST URL + token (Upstash uses the same
// hostname and token for both protocols).
function resolveConnectionUrl(): string {
  const explicit = process.env['UPSTASH_REDIS_CONNECTION_URL']
  if (explicit) return explicit

  const restUrl = process.env['UPSTASH_REDIS_URL']
  const token = process.env['UPSTASH_REDIS_TOKEN']
  if (restUrl && token) {
    const host = restUrl.replace(/^https?:\/\//, '')
    return `rediss://default:${token}@${host}:6379`
  }

  throw new Error(
    'Missing Redis connection config. Set UPSTASH_REDIS_CONNECTION_URL or both UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN.',
  )
}

const connectionUrl = resolveConnectionUrl()

export const bullmqConnection = new IORedis(connectionUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  tls: {},
})

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
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
}
