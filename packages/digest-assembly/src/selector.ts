import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import type { Database } from '@astrodigest/database'
import type { DigestSections, ProcessedContent } from './types.js'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Row shape returned by the single candidate query.
 * Extends ProcessedContent with the raw_content columns needed for
 * in-memory selection (source, image_url, relevance_score).
 */
type CandidateRow = ProcessedContent & {
  source: string
  image_url: string | null
  relevance_score: number | null
}

// ---------------------------------------------------------------------------
// Source-preference rank for quick-hit ordering.
// Lower number = preferred. Sources not listed fall back to rank 99.
// ---------------------------------------------------------------------------

const QUICK_HIT_SOURCE_RANK: Readonly<Record<string, number>> = {
  nasa: 0,
  eso: 0,
  alma: 0,
  arxiv: 1,
  nasaspaceflight: 2,
  spaceflightnow: 2,
  spacex: 3,
  planetary: 4,
}

const IMAGE_SOURCES = new Set(['nasa', 'eso', 'alma'])
const SPACE_NEWS_SOURCES = new Set(['nasaspaceflight', 'spacex'])
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// ContentSelector
// ---------------------------------------------------------------------------

export class ContentSelector {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly logger: Logger,
  ) {}

  /**
   * Fetches all eligible processed content from the last 7 days in a single
   * query, then applies in-memory selection logic to populate each digest
   * section.
   */
  async selectWeekContent(): Promise<DigestSections> {
    const windowEnd = new Date()
    const windowStart = new Date(windowEnd.getTime() - WEEK_MS)

    this.logger.debug({ windowStart, windowEnd }, 'fetching week candidates')

    // ------------------------------------------------------------------
    // Single query: all eligible rows for the week, ordered by relevance.
    // We pull raw_content columns alongside processed_content so the
    // in-memory pass can filter by source / image_url / relevance_score
    // without extra round-trips.
    // ------------------------------------------------------------------

    let candidates: CandidateRow[]
    try {
      const rows = await this.db
        .selectFrom('processed_content')
        .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
        .selectAll('processed_content')
        .select(['raw_content.source', 'raw_content.image_url', 'raw_content.relevance_score'])
        .where('processed_content.created_at', '>=', windowStart)
        .where('processed_content.flagged', '=', false)
        .where('processed_content.confidence_score', '>=', 0.6)
        .orderBy('raw_content.relevance_score', 'desc')
        .execute()

      // Safe cast: the query result is a superset of CandidateRow; we are
      // narrowing to the fields we declared above.
      candidates = rows as unknown as CandidateRow[]
    } catch (err) {
      this.logger.error(
        { err, windowStart, windowEnd },
        'DB query failed while fetching week candidates',
      )
      throw err
    }

    this.logger.debug({ count: candidates.length }, 'week candidates fetched')

    // ------------------------------------------------------------------
    // Selection pass — each step marks chosen IDs so later steps skip them
    // ------------------------------------------------------------------

    const usedIds = new Set<string>()

    // 1. Big story — highest scored item overall
    const bigStory = candidates[0]
    if (bigStory === undefined) {
      throw new Error('No processed content available for this week — cannot assemble digest')
    }
    usedIds.add(bigStory.id)

    // 2. Image of week — highest scored nasa/eso/alma item with an image_url,
    //    not already used.  Null when no candidate exists (soft failure).
    const imageOfWeek =
      candidates.find(
        (c) => !usedIds.has(c.id) && IMAGE_SOURCES.has(c.source) && c.image_url !== null,
      ) ?? null
    if (imageOfWeek !== null) {
      usedIds.add(imageOfWeek.id)
    } else {
      this.logger.warn('No image-of-week candidate found for this week')
    }

    // 3. Paper deep dive — highest scored arxiv item, not already used
    const paperDeepDive = candidates.find((c) => !usedIds.has(c.id) && c.source === 'arxiv')
    if (paperDeepDive === undefined) {
      throw new Error('No arxiv content available for paper deep dive this week')
    }
    usedIds.add(paperDeepDive.id)

    // 4. Quick hits — up to 3 items, sorted by source-preference rank then
    //    score, from the remaining candidates
    const remaining = candidates.filter((c) => !usedIds.has(c.id))

    const quickHits = remaining
      .slice() // don't mutate remaining
      .sort((a, b) => {
        const rankA = QUICK_HIT_SOURCE_RANK[a.source] ?? 99
        const rankB = QUICK_HIT_SOURCE_RANK[b.source] ?? 99
        if (rankA !== rankB) return rankA - rankB
        // Within the same rank tier, preserve the original score order
        return (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
      })
      .slice(0, 3)

    for (const h of quickHits) usedIds.add(h.id)

    if (quickHits.length < 3) {
      this.logger.warn(
        { available: quickHits.length },
        'Fewer than 3 quick-hit candidates this week',
      )
    }

    // 5. Space news — nasaspaceflight/spacex with relevance >= 0.5, up to 2,
    //    not already used
    const spaceNews = candidates
      .filter(
        (c) =>
          !usedIds.has(c.id) && SPACE_NEWS_SOURCES.has(c.source) && (c.relevance_score ?? 0) >= 0.5,
      )
      .slice(0, 2)

    // ------------------------------------------------------------------
    // Summary log
    // ------------------------------------------------------------------

    this.logger.info(
      {
        bigStoryId: bigStory.id,
        imageOfWeekId: imageOfWeek?.id ?? null,
        paperDeepDiveId: paperDeepDive.id,
        quickHitCount: quickHits.length,
        spaceNewsCount: spaceNews.length,
        totalCandidates: candidates.length,
      },
      'week content selected',
    )

    return {
      bigStory: stripJoinColumns(bigStory),
      imageOfWeek: imageOfWeek !== null ? stripJoinColumns(imageOfWeek) : null,
      paperDeepDive: stripJoinColumns(paperDeepDive),
      quickHits: quickHits.map(stripJoinColumns),
      ...(spaceNews.length > 0 ? { spaceNews: spaceNews.map(stripJoinColumns) } : {}),
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips the raw_content join columns (source, image_url, relevance_score)
 * from a CandidateRow, yielding a plain ProcessedContent.
 */
function stripJoinColumns({
  source: _source,
  image_url: _image_url,
  relevance_score: _relevance_score,
  ...rest
}: CandidateRow): ProcessedContent {
  return rest
}
