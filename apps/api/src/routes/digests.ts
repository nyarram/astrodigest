import type { FastifyInstance } from 'fastify'
import { db } from '../lib/db.js'
import { redis } from '../lib/redis.js'

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface ContentItem {
  id: string
  summary_short: string | null
  summary_long: string | null
  title: string | null
  url: string | null
  image_url: string | null
  source: string | null
  published_at: string | null
}

interface DigestDetail {
  id: string
  week_of: string
  status: string
  delivered_at: string | null
  big_story: ContentItem | null
  image_of_week: ContentItem | null
  paper_dive: ContentItem | null
  quick_hits: ContentItem[]
}

interface DigestSummary {
  id: string
  week_of: string
  status: string
  delivered_at: string | null
  big_story_title: string | null
}

// ---------------------------------------------------------------------------
// JSON schemas
// ---------------------------------------------------------------------------

const contentItemProps = {
  id: { type: 'string' },
  summary_short: { type: 'string', nullable: true },
  summary_long: { type: 'string', nullable: true },
  title: { type: 'string', nullable: true },
  url: { type: 'string', nullable: true },
  image_url: { type: 'string', nullable: true },
  source: { type: 'string', nullable: true },
  published_at: { type: 'string', nullable: true },
}

const nullableContentItemSchema = {
  type: 'object',
  nullable: true,
  properties: contentItemProps,
}

const digestDetailResponseSchema = {
  200: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      week_of: { type: 'string' },
      status: { type: 'string' },
      delivered_at: { type: 'string', nullable: true },
      big_story: nullableContentItemSchema,
      image_of_week: nullableContentItemSchema,
      paper_dive: nullableContentItemSchema,
      quick_hits: {
        type: 'array',
        items: { type: 'object', properties: contentItemProps },
      },
    },
  },
}

const digestListResponseSchema = {
  200: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        week_of: { type: 'string' },
        status: { type: 'string' },
        delivered_at: { type: 'string', nullable: true },
        big_story_title: { type: 'string', nullable: true },
      },
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
// Query helpers
// ---------------------------------------------------------------------------

// Column list shared between single-item and batch fetches
const CONTENT_SELECT = [
  'processed_content.id',
  'processed_content.summary_short',
  'processed_content.summary_long',
  'raw_content.title',
  'raw_content.url',
  'raw_content.image_url',
  'raw_content.source',
  'raw_content.published_at',
] as const

function mapContentRow(row: {
  id: string
  summary_short: string | null
  summary_long: string | null
  title: string | null
  url: string | null
  image_url: string | null
  source: string | null
  published_at: Date | null
}): ContentItem {
  return {
    id: row.id,
    summary_short: row.summary_short,
    summary_long: row.summary_long,
    title: row.title,
    url: row.url,
    image_url: row.image_url,
    source: row.source,
    published_at: row.published_at?.toISOString() ?? null,
  }
}

async function fetchContentItem(contentId: string): Promise<ContentItem | null> {
  const row = await db
    .selectFrom('processed_content')
    .leftJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
    .select(CONTENT_SELECT)
    .where('processed_content.id', '=', contentId)
    .executeTakeFirst()

  return row ? mapContentRow(row) : null
}

async function fetchDigestDetail(digestId: string): Promise<DigestDetail | null> {
  const digest = await db
    .selectFrom('digests')
    .selectAll()
    .where('id', '=', digestId)
    .executeTakeFirst()

  if (!digest) return null

  const quickHitIds = digest.quick_hit_ids ?? []

  const [bigStory, imageOfWeek, paperDive, quickHits] = await Promise.all([
    digest.big_story_id ? fetchContentItem(digest.big_story_id) : Promise.resolve(null),
    digest.image_of_week_id ? fetchContentItem(digest.image_of_week_id) : Promise.resolve(null),
    digest.paper_dive_id ? fetchContentItem(digest.paper_dive_id) : Promise.resolve(null),
    quickHitIds.length > 0
      ? db
          .selectFrom('processed_content')
          .leftJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
          .select(CONTENT_SELECT)
          .where('processed_content.id', 'in', quickHitIds)
          .execute()
          .then((rows) => rows.map(mapContentRow))
      : Promise.resolve([] as ContentItem[]),
  ])

  return {
    id: digest.id,
    week_of: digest.week_of.toISOString(),
    status: digest.status,
    delivered_at: digest.delivered_at?.toISOString() ?? null,
    big_story: bigStory,
    image_of_week: imageOfWeek,
    paper_dive: paperDive,
    quick_hits: quickHits,
  }
}

// Re-throw errors that already carry an HTTP status code (e.g. from
// fastify.httpErrors.*) so they reach Fastify's error handler unchanged.
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
  // ---- GET /latest --------------------------------------------------------

  fastify.get(
    '/latest',
    { schema: { response: digestDetailResponseSchema } },
    async (): Promise<DigestDetail> => {
      try {
        const cached = await redis.get<DigestDetail>('digest:latest')
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

  // ---- GET / --------------------------------------------------------------

  fastify.get<{ Querystring: { page: number; limit: number } }>(
    '/',
    { schema: { querystring: listQuerySchema, response: digestListResponseSchema } },
    async (request): Promise<DigestSummary[]> => {
      try {
        const { page, limit } = request.query
        const offset = (page - 1) * limit

        const rows = await db
          .selectFrom('digests')
          .leftJoin('processed_content', 'processed_content.id', 'digests.big_story_id')
          .leftJoin('raw_content', 'raw_content.id', 'processed_content.raw_content_id')
          .select([
            'digests.id',
            'digests.week_of',
            'digests.status',
            'digests.delivered_at',
            'raw_content.title as big_story_title',
          ])
          .orderBy('digests.week_of', 'desc')
          .limit(limit)
          .offset(offset)
          .execute()

        return rows.map((row) => ({
          id: row.id,
          week_of: row.week_of.toISOString(),
          status: row.status,
          delivered_at: row.delivered_at?.toISOString() ?? null,
          big_story_title: row.big_story_title ?? null,
        }))
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to list digests')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )

  // ---- GET /:id -----------------------------------------------------------

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { response: digestDetailResponseSchema } },
    async (request): Promise<DigestDetail> => {
      try {
        const { id } = request.params

        const cached = await redis.get<DigestDetail>(`digest:${id}`)
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
