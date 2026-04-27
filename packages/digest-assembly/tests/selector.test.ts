import { describe, it, expect, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { Kysely } from 'kysely'
import pino from 'pino'
import type { Database } from '@astrodigest/database'
import { ContentSelector } from '../src/selector.js'
import type { ProcessedContent } from '../src/types.js'

// Mirrors the internal CandidateRow shape from selector.ts (not exported).
type CandidateRow = ProcessedContent & {
  source: string
  image_url: string | null
  relevance_score: number | null
}

// Suppress all log output during tests.
const logger = pino({ level: 'silent' })

const BASE_DATE = new Date('2025-01-06T00:00:00Z')

function makeCandidate(
  id: string,
  source: string,
  relevance_score: number,
  overrides: Partial<CandidateRow> = {},
): CandidateRow {
  return {
    id,
    raw_content_id: null,
    summary_short: null,
    summary_long: null,
    prompt_version_id: null,
    model_used: null,
    input_tokens: null,
    output_tokens: null,
    confidence_score: 0.8,
    flagged: false,
    created_at: BASE_DATE,
    source,
    image_url: null,
    relevance_score,
    ...overrides,
  }
}

type MockQb = {
  innerJoin: Mock
  selectAll: Mock
  select: Mock
  where: Mock
  orderBy: Mock
  execute: Mock
}

function makeDbMock(rows: CandidateRow[]): { db: Kysely<Database>; qb: MockQb } {
  const qb: MockQb = {
    innerJoin: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(rows),
  }
  const db = { selectFrom: vi.fn().mockReturnValue(qb) } as unknown as Kysely<Database>
  return { db, qb }
}

// Minimal valid dataset: one general item (bigStory) + one arxiv (paperDeepDive).
// imageOfWeek will be null; no quickHits or spaceNews.
const MINIMAL: CandidateRow[] = [
  makeCandidate('bs', 'nasa', 0.9),
  makeCandidate('pd', 'arxiv', 0.5),
]

describe('ContentSelector.selectWeekContent', () => {
  describe('bigStory', () => {
    it('picks the highest relevance_score item', async () => {
      const { db } = makeDbMock([
        makeCandidate('top', 'nasa', 0.95),
        makeCandidate('mid', 'eso', 0.7),
        makeCandidate('bot', 'arxiv', 0.4),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()
      expect(result.bigStory.id).toBe('top')
    })
  })

  describe('imageOfWeek', () => {
    it('selects a nasa/eso/alma item with image_url and does not duplicate bigStory', async () => {
      // bigStory is the highest-scored nasa item (with image_url) — it must be skipped for imageOfWeek.
      const { db } = makeDbMock([
        makeCandidate('bs', 'nasa', 0.95, { image_url: 'https://nasa.gov/apod.jpg' }),
        makeCandidate('iow', 'eso', 0.85, { image_url: 'https://eso.org/pic.jpg' }),
        makeCandidate('pd', 'arxiv', 0.7),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()

      expect(result.imageOfWeek).not.toBeNull()
      expect(result.imageOfWeek?.id).toBe('iow')
      expect(result.imageOfWeek?.id).not.toBe(result.bigStory.id)
    })
  })

  describe('paperDeepDive', () => {
    it('picks an arxiv item that does not duplicate bigStory or imageOfWeek', async () => {
      // bigStory is itself arxiv — paperDeepDive must fall through to the next arxiv item.
      const { db } = makeDbMock([
        makeCandidate('bs', 'arxiv', 0.95),
        makeCandidate('iow', 'nasa', 0.85, { image_url: 'https://nasa.gov/img.jpg' }),
        makeCandidate('pd', 'arxiv', 0.7),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()

      expect(result.paperDeepDive.id).toBe('pd')
      expect(result.paperDeepDive.id).not.toBe(result.bigStory.id)
      expect(result.paperDeepDive.id).not.toBe(result.imageOfWeek?.id)
    })
  })

  describe('quickHits', () => {
    it('contains exactly 3 non-overlapping items when enough candidates exist', async () => {
      const { db } = makeDbMock([
        makeCandidate('bs', 'nasaspaceflight', 0.95),
        makeCandidate('iow', 'nasa', 0.9, { image_url: 'https://img.jpg' }),
        makeCandidate('pd', 'arxiv', 0.85),
        makeCandidate('qh1', 'nasa', 0.8),
        makeCandidate('qh2', 'eso', 0.75),
        makeCandidate('qh3', 'arxiv', 0.7),
        makeCandidate('extra', 'spacex', 0.65),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()

      const priorIds = new Set([
        result.bigStory.id,
        result.paperDeepDive.id,
        ...(result.imageOfWeek !== null ? [result.imageOfWeek.id] : []),
      ])

      expect(result.quickHits).toHaveLength(3)
      for (const hit of result.quickHits) {
        expect(priorIds.has(hit.id)).toBe(false)
      }
    })

    it('returns fewer than 3 items when candidates are scarce', async () => {
      // Only 2 items left after bigStory and paperDeepDive are claimed.
      const { db } = makeDbMock([
        makeCandidate('bs', 'nasaspaceflight', 0.95),
        makeCandidate('pd', 'arxiv', 0.85),
        makeCandidate('qh1', 'eso', 0.8),
        makeCandidate('qh2', 'alma', 0.75),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()
      expect(result.quickHits).toHaveLength(2)
    })
  })

  describe('DB query filters', () => {
    it('excludes flagged items via WHERE clause on processed_content.flagged', async () => {
      const { db, qb } = makeDbMock(MINIMAL)
      await new ContentSelector(db, logger).selectWeekContent()
      expect(qb.where).toHaveBeenCalledWith('processed_content.flagged', '=', false)
    })

    it('excludes low-confidence items via WHERE clause on processed_content.confidence_score', async () => {
      const { db, qb } = makeDbMock(MINIMAL)
      await new ContentSelector(db, logger).selectWeekContent()
      expect(qb.where).toHaveBeenCalledWith('processed_content.confidence_score', '>=', 0.6)
    })
  })

  describe('spaceNews', () => {
    it('is undefined when no nasaspaceflight or spacex items exist', async () => {
      // Only alma + arxiv — neither is a SPACE_NEWS_SOURCE.
      const { db } = makeDbMock([
        makeCandidate('bs', 'alma', 0.9),
        makeCandidate('pd', 'arxiv', 0.5),
      ])
      const result = await new ContentSelector(db, logger).selectWeekContent()
      expect(result.spaceNews).toBeUndefined()
    })
  })
})
