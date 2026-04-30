import type { Digest, UserPreferences, User } from '@astrodigest/shared'

export type { Digest, UserPreferences, User }

export interface ApiError {
  message: string
  status: number
  code?: string
}

export interface PaginatedDigests {
  digests: Digest[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface RegisterPayload {
  clerkId: string
  email: string
}
