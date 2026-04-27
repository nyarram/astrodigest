import type { Selectable } from 'kysely'
import type { ProcessedContentTable } from '@astrodigest/database'

export type ProcessedContent = Selectable<ProcessedContentTable>

export interface DigestSections {
  bigStory: ProcessedContent
  quickHits: [ProcessedContent, ProcessedContent, ProcessedContent]
  imageOfWeek: ProcessedContent
  paperDeepDive: ProcessedContent
  spaceNews?: ProcessedContent[]
}
