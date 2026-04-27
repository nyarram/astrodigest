import { db } from '@astrodigest/database'
import { logger } from './logger.js'
import { ContentSelector } from './selector.js'
import type { DigestSections } from './types.js'

export class DigestAssembler {
  private readonly selector = new ContentSelector()

  async assemble(): Promise<DigestSections> {
    logger.info('assembling digest sections')

    const bigStory = await this.selector.selectBigStory()
    const quickHits = await this.selector.selectQuickHits(bigStory.id)

    const usedIds = [bigStory.id, ...quickHits.map((h) => h.id)]

    const imageOfWeek = await this.selector.selectImageOfWeek(usedIds)
    usedIds.push(imageOfWeek.id)

    const paperDeepDive = await this.selector.selectPaperDeepDive(usedIds)
    usedIds.push(paperDeepDive.id)

    const spaceNews = await this.selector.selectSpaceNews(usedIds)

    const sections: DigestSections = {
      bigStory,
      quickHits,
      imageOfWeek,
      paperDeepDive,
      ...(spaceNews.length > 0 ? { spaceNews } : {}),
    }

    logger.info(
      {
        bigStoryId: bigStory.id,
        quickHitCount: quickHits.length,
        imageOfWeekId: imageOfWeek.id,
        paperDeepDiveId: paperDeepDive.id,
        spaceNewsCount: spaceNews.length,
      },
      'digest sections assembled',
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
        image_of_week_id: sections.imageOfWeek.id,
        paper_dive_id: sections.paperDeepDive.id,
        status: 'assembled',
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    logger.info({ digestId: digest.id }, 'digest persisted')
    return digest.id
  }
}
