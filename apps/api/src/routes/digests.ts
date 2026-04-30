import type { FastifyInstance } from 'fastify'
import { db } from '../lib/db.js'
import { redis } from '../lib/redis.js'

// ---------------------------------------------------------------------------
// Internal DB row type after join
// ---------------------------------------------------------------------------

interface ContentRow {
  id: string
  summary_short: string | null
  summary_long: string | null
  abstract: string | null
  title: string | null
  url: string | null
  image_url: string | null
  source: string | null
  published_at: Date | null
}

// ---------------------------------------------------------------------------
// API response types (camelCase, matching @astrodigest/shared Digest)
// ---------------------------------------------------------------------------

interface StoryItem {
  title: string
  summary: string
  sourceUrl: string
  source: string
  imageUrl: string | null
}

interface PaperItem {
  title: string
  authors: string[]
  abstract: string
  summary: string
  arxivUrl: string
}

interface ImageItem {
  title: string
  description: string
  imageUrl: string
  credit: null
}

interface DigestSectionsResponse {
  bigStory: StoryItem
  quickHits: StoryItem[]
  imageOfWeek: ImageItem | null
  paperDeepDive: PaperItem | null
  spaceNews: []
}

interface DigestDetailResponse {
  id: string
  weekStart: string
  weekEnd: string
  status: string
  createdAt: string
  deliveredAt: string | null
  sections: DigestSectionsResponse
}

interface PaginatedDigestsResponse {
  digests: DigestDetailResponse[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// JSON schemas
// ---------------------------------------------------------------------------

const storyItemSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    sourceUrl: { type: 'string' },
    source: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
  },
}

const paperItemSchema = {
  type: 'object',
  nullable: true,
  properties: {
    title: { type: 'string' },
    authors: { type: 'array', items: { type: 'string' } },
    abstract: { type: 'string' },
    summary: { type: 'string' },
    arxivUrl: { type: 'string' },
  },
}

const imageItemSchema = {
  type: 'object',
  nullable: true,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    imageUrl: { type: 'string' },
    credit: { type: 'string', nullable: true },
  },
}

const sectionsSchema = {
  type: 'object',
  properties: {
    bigStory: storyItemSchema,
    quickHits: { type: 'array', items: storyItemSchema },
    imageOfWeek: imageItemSchema,
    paperDeepDive: paperItemSchema,
    spaceNews: { type: 'array', items: {} },
  },
}

const digestDetailSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    weekStart: { type: 'string' },
    weekEnd: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'string' },
    deliveredAt: { type: 'string', nullable: true },
    sections: sectionsSchema,
  },
}

const digestDetailResponseSchema = { 200: digestDetailSchema }

const digestListResponseSchema = {
  200: {
    type: 'object',
    properties: {
      digests: { type: 'array', items: digestDetailSchema },
      total: { type: 'integer' },
      page: { type: 'integer' },
      limit: { type: 'integer' },
      hasMore: { type: 'boolean' },
    },
  },
}

const listQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
  },
}

// ---------------------------------------------------------------------------
// Content select columns (shared between single and batch fetches)
// ---------------------------------------------------------------------------

const CONTENT_SELECT = [
  'processed_content.id',
  'processed_content.summary_short',
  'processed_content.summary_long',
  'raw_content.title',
  'raw_content.url',
  'raw_content.image_url',
  'raw_content.source',
  'raw_content.published_at',
  'raw_content.abstract',
] as const

// ---------------------------------------------------------------------------
// Row → typed response helpers
// ---------------------------------------------------------------------------

function toStoryItem(row: ContentRow): StoryItem {
  return {
    title: row.title ?? 'Untitled',
    summary: row.summary_short ?? row.summary_long ?? '',
    sourceUrl: row.url ?? '#',
    source: row.source ?? 'unknown',
    imageUrl: row.image_url,
  }
}

function toPaperItem(row: ContentRow): PaperItem {
  return {
    title: row.title ?? 'Untitled',
    authors: [],
    abstract: row.abstract ?? '',
    summary: row.summary_short ?? row.summary_long ?? '',
    arxivUrl: row.url ?? '#',
  }
}

function toImageItem(row: ContentRow): ImageItem {
  return {
    title: row.title ?? '',
    description: row.summary_short ?? '',
    imageUrl: row.image_url ?? '',
    credit: null,
  }
}

async function fetchContentRow(contentId: string): Promise<ContentRow | null> {
  const row = await db
    .selectFrom('processed_content')
    .leftJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
    .select(CONTENT_SELECT)
    .where('processed_content.id', '=', contentId)
    .executeTakeFirst()

  return row ?? null
}

// ---------------------------------------------------------------------------
// fetchDigestDetail — returns the shared Digest shape
// ---------------------------------------------------------------------------

async function fetchDigestDetail(digestId: string): Promise<DigestDetailResponse | null> {
  const digest = await db
    .selectFrom('digests')
    .selectAll()
    .where('id', '=', digestId)
    .executeTakeFirst()

  if (!digest) return null

  const quickHitIds = digest.quick_hit_ids ?? []

  const [bigStoryRow, imageRow, paperRow, quickHitRows] = await Promise.all([
    digest.big_story_id ? fetchContentRow(digest.big_story_id) : Promise.resolve(null),
    digest.image_of_week_id ? fetchContentRow(digest.image_of_week_id) : Promise.resolve(null),
    digest.paper_dive_id ? fetchContentRow(digest.paper_dive_id) : Promise.resolve(null),
    quickHitIds.length > 0
      ? db
          .selectFrom('processed_content')
          .leftJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
          .select(CONTENT_SELECT)
          .where('processed_content.id', 'in', quickHitIds)
          .execute()
      : Promise.resolve([] as ContentRow[]),
  ])

  if (!bigStoryRow) return null

  const weekStart = (digest.week_start ?? digest.week_of).toISOString()
  const weekEnd = (digest.week_end ?? digest.week_of).toISOString()

  return {
    id: digest.id,
    weekStart,
    weekEnd,
    status: digest.status,
    createdAt: digest.created_at.toISOString(),
    deliveredAt: digest.delivered_at?.toISOString() ?? null,
    sections: {
      bigStory: toStoryItem(bigStoryRow),
      quickHits: quickHitRows.map(toStoryItem),
      imageOfWeek: imageRow ? toImageItem(imageRow) : null,
      paperDeepDive: paperRow ? toPaperItem(paperRow) : null,
      spaceNews: [],
    },
  }
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function isHttpError(err: unknown): err is { statusCode: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as Record<string, unknown>)['statusCode'] === 'number'
  )
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function digestRoutes(fastify: FastifyInstance): Promise<void> {
  // ---- GET /latest ----------------------------------------------------------

  fastify.get(
    '/latest',
    { schema: { response: digestDetailResponseSchema } },
    async (): Promise<DigestDetailResponse> => {
      try {
        const cached = await redis.get<DigestDetailResponse>('digest:latest')
        if (cached) return cached

        const row = await db
          .selectFrom('digests')
          .select('id')
          .where('status', 'in', ['delivered', 'assembled', 'ready'])
          .orderBy('week_of', 'desc')
          .limit(1)
          .executeTakeFirst()

        if (!row) {
          throw fastify.httpErrors.notFound('No digest available yet')
        }

        const detail = await fetchDigestDetail(row.id)
        if (!detail) {
          throw fastify.httpErrors.notFound('No digest available yet')
        }

        await redis.set('digest:latest', detail, { ex: 3600 })

        return detail
      } catch (err) {
        if (isHttpError(err)) throw err
        fastify.log.error({ err }, 'Failed to fetch latest digest')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )

  // ---- GET / ----------------------------------------------------------------

  fastify.get<{ Querystring: { page: number; limit: number } }>(
    '/',
    { schema: { querystring: listQuerySchema, response: digestListResponseSchema } },
    async (request): Promise<PaginatedDigestsResponse> => {
      try {
        const { page, limit } = request.query
        const offset = (page - 1) * limit

        const [rows, countRow] = await Promise.all([
          db
            .selectFrom('digests')
            .select(['digests.id'])
            .where('status', 'in', ['delivered', 'assembled', 'ready'])
            .orderBy('digests.week_of', 'desc')
            .limit(limit)
            .offset(offset)
            .execute(),
          db
            .selectFrom('digests')
            .where('status', 'in', ['delivered', 'assembled', 'ready'])
            .select(db.fn.countAll<number>().as('count'))
            .executeTakeFirstOrThrow(),
        ])

        const digests = (await Promise.all(rows.map((r) => fetchDigestDetail(r.id)))).filter(
          (d): d is DigestDetailResponse => d !== null,
        )

        const total = Number(countRow.count)

        return {
          digests,
          total,
          page,
          limit,
          hasMore: offset + rows.length < total,
        }
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to list digests')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )

  // ---- GET /:id -------------------------------------------------------------

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { response: digestDetailResponseSchema } },
    async (request): Promise<DigestDetailResponse> => {
      try {
        const { id } = request.params

        const cached = await redis.get<DigestDetailResponse>(`digest:${id}`)
        if (cached) return cached

        const detail = await fetchDigestDetail(id)
        if (!detail) {
          throw fastify.httpErrors.notFound('Digest not found')
        }

        await redis.set(`digest:${id}`, detail, { ex: 86400 })

        return detail
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to fetch digest')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )
}
