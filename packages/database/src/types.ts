import type { Generated } from 'kysely'

export interface UsersTable {
  id: Generated<string>
  clerk_id: string
  email: string
  push_token: string | null
  push_notifications_enabled: Generated<boolean>
  created_at: Generated<Date>
}

export interface UserPreferencesTable {
  user_id: string
  topic: string
}

export interface RawContentTable {
  id: Generated<string>
  source: string
  source_id: string
  title: string
  abstract: string | null
  url: string
  image_url: string | null
  relevance_score: number | null
  published_at: Date | null
  ingested_at: Generated<Date>
  status: Generated<string>
}

export interface PromptVersionsTable {
  id: Generated<string>
  name: string
  version: number
  prompt_template: string
  model: string
  active: Generated<boolean>
  created_at: Generated<Date>
}

export interface ProcessedContentTable {
  id: Generated<string>
  raw_content_id: string | null
  summary_short: string | null
  summary_long: string | null
  prompt_version_id: string | null
  model_used: string | null
  input_tokens: number | null
  output_tokens: number | null
  confidence_score: number | null
  flagged: Generated<boolean>
  created_at: Generated<Date>
}

export interface DigestsTable {
  id: Generated<string>
  /** Legacy anchor kept for API compat. New code uses week_start/week_end. */
  week_of: Date
  /** Monday 00:00:00 UTC for the digest's week (added in migration 008). */
  week_start: Date | null
  /** Sunday 23:59:59 UTC for the digest's week (added in migration 008). */
  week_end: Date | null
  big_story_id: string | null
  quick_hit_ids: string[] | null
  image_of_week_id: string | null
  paper_dive_id: string | null
  /** Full DigestSections payload serialised as JSON (added in migration 008). */
  sections: string | null
  status: Generated<string>
  delivered_at: Date | null
  created_at: Generated<Date>
}

export interface Database {
  users: UsersTable
  user_preferences: UserPreferencesTable
  raw_content: RawContentTable
  prompt_versions: PromptVersionsTable
  processed_content: ProcessedContentTable
  digests: DigestsTable
}
