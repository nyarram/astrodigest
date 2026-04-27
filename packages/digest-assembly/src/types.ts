import type { Selectable } from 'kysely'
import type { ProcessedContentTable } from '@astrodigest/database'

export type ProcessedContent = Selectable<ProcessedContentTable>

export interface DigestSections {
  bigStory: ProcessedContent
  /** Up to 3 items; may be fewer if fewer candidates are available this week. */
  quickHits: ProcessedContent[]
  /** Null when no nasa/eso/alma image candidate exists for the week. */
  imageOfWeek: ProcessedContent | null
  paperDeepDive: ProcessedContent
  spaceNews?: ProcessedContent[]
}
