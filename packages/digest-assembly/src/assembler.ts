import { db } from '@astrodigest/database'
import { logger } from './logger.js'
import { ContentSelector } from './selector.js'
import type { DigestSections } from './types.js'

export class DigestAssembler {
  private readonly selector = new ContentSelector(db, logger)

  async assemble(): Promise<DigestSections> {
    logger.info('starting digest assembly')

    const sections = await this.selector.selectWeekContent()

    logger.info(
      {
        bigStoryId: sections.bigStory.id,
        imageOfWeekId: sections.imageOfWeek?.id ?? null,
        paperDeepDiveId: sections.paperDeepDive.id,
        quickHitCount: sections.quickHits.length,
        spaceNewsCount: sections.spaceNews?.length ?? 0,
      },
      'digest assembly complete',
    )

    return sections
  }

  async persist(weekOf: Date, sections: DigestSections): Promise<string> {
    logger.info({ weekOf }, 'persisting digest')

    const digest = await db
      .insertInto('digests')
      .values({
        week_of: weekOf,
        big_story_id: sections.bigStory.id,
        quick_hit_ids: sections.quickHits.map((h) => h.id),
        image_of_week_id: sections.imageOfWeek?.id ?? null,
        paper_dive_id: sections.paperDeepDive.id,
        status: 'assembled',
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    logger.info({ digestId: digest.id }, 'digest persisted')
    return digest.id
  }
}
