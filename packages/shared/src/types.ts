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

// ─── Digest ──────────────────────────────────────────────────────────────────

export interface BigStory {
  title: string
  summary: string
  sourceUrl: string
  source: SourceType
  relevanceScore?: number
  imageUrl?: string
}

export interface QuickHit {
  title: string
  summary: string
  sourceUrl: string
  source: SourceType
  relevanceScore?: number
}

export interface ImageOfWeek {
  title: string
  description: string
  imageUrl: string
  credit?: string
}

export interface PaperDeepDive {
  title: string
  authors: string[]
  abstract: string
  summary: string
  arxivUrl: string
}

export interface SpaceNewsItem {
  title: string
  summary: string
  sourceUrl: string
}

export interface DigestSections {
  bigStory: BigStory
  quickHits: QuickHit[]
  imageOfWeek: ImageOfWeek
  paperDeepDive: PaperDeepDive
  spaceNews?: SpaceNewsItem[]
}

export type DigestStatus = 'draft' | 'published' | 'delivered'

export interface Digest {
  id: string
  weekStart: string
  weekEnd: string
  status: DigestStatus
  sections: DigestSections
  createdAt: string
  deliveredAt?: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type DeliveryDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface UserPreferences {
  sources: SourceType[]
  topics: string[]
  deliveryDay: DeliveryDay
  deliveryTime: string // HH:MM
  timezone: string
}

export interface User {
  id: string
  clerkId: string
  email: string
  preferences: UserPreferences
  pushToken?: string
  createdAt: string
}
