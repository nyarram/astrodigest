import { Worker } from 'bullmq'
import { db } from '@astrodigest/database'
import { bullmqConnection, editorialQueue } from '../queues.js'
import { logger } from '../logger.js'
import type { EditorialJob } from '../queues.js'

// ---------------------------------------------------------------------------
// Quality checks
// ---------------------------------------------------------------------------

const REFUSAL_PHRASES = ['I cannot', "I don't have", 'As an AI', "I'm not able"]

function checkMinLength(summary: string): string | null {
  return summary.length >= 80 ? null : 'summary_short too short (< 80 chars)'
}

function checkNoRefusalPhrases(summary: string): string | null {
  const hit = REFUSAL_PHRASES.find((phrase) => summary.includes(phrase))
  return hit ? `summary_short contains refusal phrase: "${hit}"` : null
}

function checkNotLazyParaphrase(summary: string, title: string): string | null {
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)

  if (titleWords.length === 0) return null

  const summaryWords = summary.toLowerCase().split(/\s+/)
  const titleWordSet = new Set(titleWords)
  const overlapCount = summaryWords.filter((w) => titleWordSet.has(w)).length
  const overlapRatio = overlapCount / summaryWords.length

  return overlapRatio > 0.5
    ? `summary_short is more than 50% title words (${Math.round(overlapRatio * 100)}% overlap)`
    : null
}

function checkLongSummaryLength(summaryLong: string): string | null {
  return summaryLong.length >= 200 ? null : 'summary_long too short (< 200 chars)'
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const editorialWorker = new Worker<EditorialJob>(
  editorialQueue.name,
  async (job) => {
    try {
      const { rawContentId, processedContentId } = job.data

      // Fetch processed_content and its linked raw_content in one join
      const row = await db
        .selectFrom('processed_content as pc')
        .innerJoin('raw_content as rc', 'rc.id', 'pc.raw_content_id')
        .select([
          'pc.id as processedId',
          'pc.summary_short',
          'pc.summary_long',
          'rc.id as rawId',
          'rc.title',
        ])
        .where('pc.id', '=', processedContentId)
        .executeTakeFirstOrThrow()

      const { summary_short, summary_long, title } = row
      const label = title.slice(0, 50)

      const failureReasons: string[] = []

      // Check 1: summary_short min length
      const lengthFailure = checkMinLength(summary_short ?? '')
      if (lengthFailure) failureReasons.push(lengthFailure)

      // Check 2: no refusal phrases
      const refusalFailure = checkNoRefusalPhrases(summary_short ?? '')
      if (refusalFailure) failureReasons.push(refusalFailure)

      // Check 3: not lazy paraphrase of title
      const paraphraseFailure = checkNotLazyParaphrase(summary_short ?? '', title)
      if (paraphraseFailure) failureReasons.push(paraphraseFailure)

      // Check 4: summary_long min length (only when present)
      if (summary_long !== null && summary_long !== undefined) {
        const longFailure = checkLongSummaryLength(summary_long)
        if (longFailure) failureReasons.push(longFailure)
      }

      const passed = failureReasons.length === 0

      // Update processed_content flagged status
      await db
        .updateTable('processed_content')
        .set({ flagged: !passed })
        .where('id', '=', processedContentId)
        .execute()

      // Update raw_content status to 'processed' regardless of flag outcome
      await db
        .updateTable('raw_content')
        .set({ status: 'processed' })
        .where('id', '=', rawContentId)
        .execute()

      if (passed) {
        logger.info(`[editorial] OK ${label}`)
      } else {
        const reason = failureReasons.join('; ')
        logger.warn(`[editorial] FLAGGED ${label} — reason: ${reason}`)
      }
    } catch (err) {
      logger.error({ err, jobId: job.id }, '[editorial] job failed')
      throw err
    }
  },
  { connection: bullmqConnection },
)

editorialWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, '[editorial] worker reported job failure')
})
