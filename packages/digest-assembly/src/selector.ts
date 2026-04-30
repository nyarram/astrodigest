import { db } from '@astrodigest/database'
import { logger } from './logger.js'
import type { ProcessedContent } from './types.js'

export class ContentSelector {
  async selectBigStory(): Promise<ProcessedContent> {
    logger.debug('selecting big story')
    const row = await db
      .selectFrom('processed_content')
      .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
      .selectAll('processed_content')
      .where('processed_content.flagged', '=', false)
      .where('raw_content.status', '=', 'processed')
      .where('raw_content.relevance_score', '>=', 0.6)
      .orderBy('raw_content.relevance_score', 'desc')
      .limit(1)
      .executeTakeFirstOrThrow()
    return row
  }

  async selectQuickHits(
    excludeId: string,
  ): Promise<[ProcessedContent, ProcessedContent, ProcessedContent]> {
    logger.debug('selecting quick hits')
    const rows = await db
      .selectFrom('processed_content')
      .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
      .selectAll('processed_content')
      .where('processed_content.flagged', '=', false)
      .where('raw_content.status', '=', 'processed')
      .where('processed_content.id', '!=', excludeId)
      .orderBy('raw_content.relevance_score', 'desc')
      .limit(3)
      .execute()

    if (rows.length < 3) {
      throw new Error(`Not enough processed content for quick hits — found ${rows.length}`)
    }

    return rows as [ProcessedContent, ProcessedContent, ProcessedContent]
  }

  async selectImageOfWeek(excludeIds: string[]): Promise<ProcessedContent> {
    logger.debug('selecting image of week')
    let query = db
      .selectFrom('processed_content')
      .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
      .selectAll('processed_content')
      .where('processed_content.flagged', '=', false)
      .where('raw_content.status', '=', 'processed')
      .where('raw_content.image_url', 'is not', null)

    if (excludeIds.length > 0) {
      query = query.where('processed_content.id', 'not in', excludeIds)
    }

    const row = await query
      .orderBy('raw_content.relevance_score', 'desc')
      .limit(1)
      .executeTakeFirstOrThrow()

    return row
  }

  async selectPaperDeepDive(excludeIds: string[]): Promise<ProcessedContent> {
    logger.debug('selecting paper deep dive')
    let query = db
      .selectFrom('processed_content')
      .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
      .selectAll('processed_content')
      .where('processed_content.flagged', '=', false)
      .where('raw_content.status', '=', 'processed')
      .where('raw_content.source', '=', 'arxiv')

    if (excludeIds.length > 0) {
      query = query.where('processed_content.id', 'not in', excludeIds)
    }

    const row = await query
      .orderBy('raw_content.relevance_score', 'desc')
      .limit(1)
      .executeTakeFirstOrThrow()

    return row
  }

  async selectSpaceNews(excludeIds: string[]): Promise<ProcessedContent[]> {
    logger.debug('selecting space news')
    let query = db
      .selectFrom('processed_content')
      .innerJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
      .selectAll('processed_content')
      .where('processed_content.flagged', '=', false)
      .where('raw_content.status', '=', 'processed')
      .where('raw_content.source', 'in', ['nasaspaceflight', 'spaceflightnow'])

    if (excludeIds.length > 0) {
      query = query.where('processed_content.id', 'not in', excludeIds)
    }

    return query.orderBy('raw_content.relevance_score', 'desc').limit(5).execute()
  }
}
