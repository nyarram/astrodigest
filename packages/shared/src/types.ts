export type SourceType =
  | 'arxiv'
  | 'nasa'
  | 'eso'
  | 'alma'
  | 'spacex'
  | 'nasaspaceflight'
  | 'spaceflightnow'
  | 'planetary'

export type ContentStatus = 'pending' | 'processed' | 'failed' | 'rejected'

export interface RawContentInsert {
  source: SourceType
  source_id: string
  title: string
  abstract?: string
  url: string
  image_url?: string
  published_at?: Date
}

export interface IngestResult {
  source: SourceType
  fetched: number
  inserted: number
  skipped: number
  failed: number
  errors: string[]
}
