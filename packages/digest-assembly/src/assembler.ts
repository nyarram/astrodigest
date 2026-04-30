import { randomUUID } from 'node:crypto'
import * as Sentry from '@sentry/node'
import { Queue } from 'bullmq'
import type { Kysely } from 'kysely'
import type IORedis from 'ioredis'
import type { Logger } from 'pino'
import type { Database } from '@astrodigest/database'
import { ContentSelector } from './selector.js'
import { getNextSaturdayDelivery, getMondayUTC, getSundayUTC } from './schedule.js'
import type { DigestSections } from './types.js'

// ---------------------------------------------------------------------------
// Delivery job payload
// ---------------------------------------------------------------------------

interface DeliveryJobPayload {
  digestId: string
  /** ISO-8601 string — when the push notification should fire. */
  scheduledFor: string
}

// ---------------------------------------------------------------------------
// DigestAssembler
// ---------------------------------------------------------------------------

export class DigestAssembler {
  private readonly selector: ContentSelector

  constructor(
    private readonly db: Kysely<Database>,
    private readonly redisClient: IORedis,
    private readonly logger: Logger,
  ) {
    this.selector = new ContentSelector(db, logger)
  }

  /**
   * Assembles the weekly digest and enqueues a delayed delivery job.
   * Idempotent: if a digest for the current week already exists,
   * logs a warning and returns the existing digest id.
   *
   * @param options.dryRun - Skip the BullMQ delivery enqueue (useful for smoke testing).
   * @returns The digest id (new or existing).
   */
  async assemble(options: { dryRun?: boolean } = {}): Promise<string> {
    return Sentry.startSpan(
      { name: 'digest.assembly', op: 'function', forceTransaction: true },
      async (txnSpan) => {
        try {
          return await this._assembleInner(options, txnSpan)
        } catch (err) {
          Sentry.captureException(err)
          throw err
        }
      },
    )
  }

  private async _assembleInner(
    options: { dryRun?: boolean },
    txnSpan: Parameters<Parameters<typeof Sentry.startSpan>[1]>[0],
  ): Promise<string> {
    const now = new Date()
    const weekStart = getMondayUTC(now)
    const weekEnd = getSundayUTC(weekStart)

    this.logger.info({ weekStart, weekEnd }, 'starting digest assembly')

    // ------------------------------------------------------------------
    // 1. Select content for the week
    // ------------------------------------------------------------------

    let sections: DigestSections
    try {
      sections = await Sentry.startSpan({ name: 'content.selection', op: 'function' }, () =>
        this.selector.selectWeekContent(),
      )
    } catch (err) {
      this.logger.error({ err }, 'content selection failed')
      throw err
    }

    // ------------------------------------------------------------------
    // 2. Idempotency guard — one digest per calendar week
    // ------------------------------------------------------------------

    let existingId: string | undefined
    try {
      const existing = await this.db
        .selectFrom('digests')
        .select('id')
        .where('week_start', '=', weekStart)
        .executeTakeFirst()
      existingId = existing?.id
    } catch (err) {
      this.logger.error({ err, weekStart }, 'DB error checking for existing digest')
      throw err
    }

    if (existingId !== undefined) {
      this.logger.warn(
        { digestId: existingId, weekStart },
        'digest for this week already exists — skipping assembly',
      )
      return existingId
    }

    // ------------------------------------------------------------------
    // 3. Build and insert the digest record
    // ------------------------------------------------------------------

    const digestId = randomUUID()
    const createdAt = new Date()

    try {
      await Sentry.startSpan({ name: 'digest.insert', op: 'db.query' }, () =>
        this.db
          .insertInto('digests')
          .values({
            id: digestId,
            // week_of kept for API backward compat; same anchor as week_start
            week_of: weekStart,
            week_start: weekStart,
            week_end: weekEnd,
            sections: JSON.stringify(sections),
            big_story_id: sections.bigStory.id,
            quick_hit_ids: sections.quickHits.map((h) => h.id),
            image_of_week_id: sections.imageOfWeek?.id ?? null,
            paper_dive_id: sections.paperDeepDive.id,
            status: 'ready',
            delivered_at: null,
            created_at: createdAt,
          })
          .executeTakeFirstOrThrow(),
      )
    } catch (err) {
      this.logger.error({ err, digestId, weekStart }, 'DB error inserting digest')
      throw err
    }

    this.logger.info({ digestId, weekStart, weekEnd }, 'digest record inserted')

    // ------------------------------------------------------------------
    // 4. Enqueue a delayed delivery job (skipped in dryRun mode)
    // ------------------------------------------------------------------

    const delivery = getNextSaturdayDelivery(now)
    const delayMs = Math.max(0, delivery.getTime() - now.getTime())

    if (!options.dryRun) {
      const deliveryQueue = new Queue<DeliveryJobPayload>('delivery', {
        connection: this.redisClient,
      })

      try {
        await Sentry.startSpan({ name: 'delivery.enqueue', op: 'queue.publish' }, () =>
          deliveryQueue.add(
            'deliver-digest',
            { digestId, scheduledFor: delivery.toISOString() },
            {
              jobId: digestId, // deduplication key — BullMQ ignores duplicate jobIds
              delay: delayMs,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          ),
        )
      } catch (err) {
        this.logger.error({ err, digestId, delivery }, 'failed to enqueue delivery job')
        throw err
      } finally {
        await deliveryQueue.close()
      }
    }

    // ------------------------------------------------------------------
    // 5. Summary log + Sentry measurements
    // ------------------------------------------------------------------

    const sectionCount = [
      sections.bigStory,
      sections.imageOfWeek,
      sections.paperDeepDive,
      ...sections.quickHits,
      ...(sections.spaceNews ?? []),
    ].filter(Boolean).length

    this.logger.info(
      {
        digestId,
        weekStart,
        weekEnd,
        sectionCount,
        dryRun: options.dryRun ?? false,
        bigStoryId: sections.bigStory.id,
        imageOfWeekId: sections.imageOfWeek?.id ?? null,
        paperDeepDiveId: sections.paperDeepDive.id,
        quickHitCount: sections.quickHits.length,
        spaceNewsCount: sections.spaceNews?.length ?? 0,
        scheduledFor: delivery.toISOString(),
        deliveryDelayMs: delayMs,
      },
      'digest assembled',
    )

    txnSpan.setStatus({ code: 1 }) // SpanStatusCode.OK
    Sentry.setMeasurement('items_selected', sectionCount, 'none')
    // confidence_score is the quality signal available post-join-strip;
    // relevance_score lives on raw_content and is not carried through to ProcessedContent.
    Sentry.setMeasurement('big_story_score', sections.bigStory.confidence_score ?? 0, 'none')
    Sentry.setMeasurement('has_image', sections.imageOfWeek !== null ? 1 : 0, 'none')

    return digestId
  }
}
