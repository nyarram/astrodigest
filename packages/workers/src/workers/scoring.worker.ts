import { Worker } from 'bullmq'
import { db } from '@astrodigest/database'
import { bullmqConnection, ingestionQueue, summarizationQueue } from '../queues.js'
import { logger } from '../logger.js'
import type { IngestionJob, SummarizationJob } from '../queues.js'

// ---------------------------------------------------------------------------
// Scoring tables
// ---------------------------------------------------------------------------

const SOURCE_WEIGHTS: Record<string, number> = {
  nasa: 0.8,
  eso: 0.8,
  alma: 0.8,
  arxiv: 0.7,
  nasaspaceflight: 0.5,
  spacex: 0.4,
}
const DEFAULT_SOURCE_WEIGHT = 0.3

const HIGH_VALUE_SIGNALS = [
  'first detection',
  'discovery',
  'unprecedented',
  'james webb',
  'black hole',
  'galactic center',
  'exoplanet',
  'dark matter',
  'gravitational wave',
  'neutron star',
  'supernova',
  'event horizon',
  'first image',
  'milky way',
  'interstellar',
]

const NOISE_SIGNALS = [
  'starlink batch',
  'routine',
  'commercial crew rotation',
  'resupply',
  'manifest update',
  'static fire',
]

const MS_PER_HOUR = 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Pure scoring function
// ---------------------------------------------------------------------------

function scoreItem(job: IngestionJob, publishedAt: Date | null): number {
  const titleLower = job.title.toLowerCase()

  // 1. Source base score
  let score = SOURCE_WEIGHTS[job.source] ?? DEFAULT_SOURCE_WEIGHT

  // 2. Noise cap — check before adding bonuses
  const isNoise = NOISE_SIGNALS.some((signal) => titleLower.includes(signal))
  if (isNoise) {
    return Math.min(score, 0.25)
  }

  // 3. High-value title signals (max +0.3)
  const signalMatches = HIGH_VALUE_SIGNALS.filter((signal) => titleLower.includes(signal)).length
  score += Math.min(signalMatches * 0.1, 0.3)

  // 4. Recency bonus
  if (publishedAt !== null) {
    const ageMs = Date.now() - publishedAt.getTime()
    if (ageMs <= 24 * MS_PER_HOUR) {
      score += 0.1
    } else if (ageMs <= 7 * 24 * MS_PER_HOUR) {
      score += 0.05
    }
  }

  return score
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const scoringWorker = new Worker<IngestionJob>(
  ingestionQueue.name,
  async (job) => {
    try {
      const { rawContentId, source, title, abstract, url } = job.data

      // Fetch published_at from DB — the ingestion job payload doesn't carry it
      const row = await db
        .selectFrom('raw_content')
        .select('published_at')
        .where('id', '=', rawContentId)
        .executeTakeFirstOrThrow()

      const score = scoreItem(job.data, row.published_at)
      const label = title.slice(0, 50)

      if (score < 0.3) {
        await db
          .updateTable('raw_content')
          .set({ status: 'rejected' })
          .where('id', '=', rawContentId)
          .execute()

        logger.info(`[scoring] ${label} → score: ${score.toFixed(2)} → rejected`)
        return
      }

      await db
        .updateTable('raw_content')
        .set({ relevance_score: score })
        .where('id', '=', rawContentId)
        .execute()

      const model: SummarizationJob['model'] =
        score >= 0.6 ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

      const summarizationPayload: SummarizationJob = {
        rawContentId,
        source,
        title,
        abstract,
        url,
        relevanceScore: score,
        model,
      }

      await summarizationQueue.add('summarize', summarizationPayload)

      const decision =
        score >= 0.6
          ? `summarize:sonnet (score: ${score.toFixed(2)})`
          : `summarize:haiku (score: ${score.toFixed(2)})`
      logger.info(`[scoring] ${label} → ${decision}`)
    } catch (err) {
      logger.error({ err, jobId: job.id }, '[scoring] job failed')
      throw err
    }
  },
  { connection: bullmqConnection },
)

scoringWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, '[scoring] worker reported job failure')
})
