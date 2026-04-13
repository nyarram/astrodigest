import type { FastifyInstance } from 'fastify'
import { db } from '../lib/db.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TOPICS = ['galactic', 'exoplanets', 'jwst', 'black_holes', 'launches'] as const

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface UserResponse {
  id: string
  clerkId: string
  email: string
  pushNotificationsEnabled: boolean
}

interface PreferencesResponse {
  userId: string
  topics: string[]
}

// ---------------------------------------------------------------------------
// JSON schemas
// ---------------------------------------------------------------------------

const registerBodySchema = {
  type: 'object',
  required: ['clerkId', 'email'],
  additionalProperties: false,
  properties: {
    clerkId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    pushToken: { type: 'string' },
  },
}

const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    clerkId: { type: 'string' },
    email: { type: 'string' },
    pushNotificationsEnabled: { type: 'boolean' },
  },
}

const preferencesBodySchema = {
  type: 'object',
  required: ['topics'],
  additionalProperties: false,
  properties: {
    topics: {
      type: 'array',
      items: { type: 'string', enum: [...VALID_TOPICS] },
    },
  },
}

const preferencesResponseSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
  },
}

const pushTokenBodySchema = {
  type: 'object',
  required: ['pushToken'],
  additionalProperties: false,
  properties: {
    pushToken: { type: 'string' },
  },
}

const pushTokenResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHttpError(err: unknown): err is { statusCode: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as Record<string, unknown>)['statusCode'] === 'number'
  )
}

function mapUser(row: {
  id: string
  clerk_id: string
  email: string
  push_notifications_enabled: boolean
}): UserResponse {
  return {
    id: row.id,
    clerkId: row.clerk_id,
    email: row.email,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // ---- POST /register -----------------------------------------------------

  fastify.post<{ Body: { clerkId: string; email: string; pushToken?: string } }>(
    '/register',
    {
      schema: {
        body: registerBodySchema,
        response: { 200: userResponseSchema },
      },
    },
    async (request): Promise<UserResponse> => {
      const { clerkId, email, pushToken } = request.body
      try {
        // Idempotent: insert only if clerk_id is not already registered
        await db
          .insertInto('users')
          .values({ clerk_id: clerkId, email, push_token: pushToken ?? null })
          .onConflict((oc) => oc.column('clerk_id').doNothing())
          .execute()

        const user = await db
          .selectFrom('users')
          .select(['id', 'clerk_id', 'email', 'push_notifications_enabled'])
          .where('clerk_id', '=', clerkId)
          .executeTakeFirstOrThrow()

        return mapUser(user)
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to register user')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )

  // ---- PUT /:id/preferences -----------------------------------------------

  fastify.put<{ Params: { id: string }; Body: { topics: string[] } }>(
    '/:id/preferences',
    {
      schema: {
        body: preferencesBodySchema,
        response: { 200: preferencesResponseSchema },
      },
    },
    async (request): Promise<PreferencesResponse> => {
      const { id } = request.params
      const { topics } = request.body
      try {
        const user = await db
          .selectFrom('users')
          .select('id')
          .where('id', '=', id)
          .executeTakeFirst()

        if (!user) {
          throw fastify.httpErrors.notFound('User not found')
        }

        await db.transaction().execute(async (trx) => {
          await trx.deleteFrom('user_preferences').where('user_id', '=', id).execute()
          if (topics.length > 0) {
            await trx
              .insertInto('user_preferences')
              .values(topics.map((topic) => ({ user_id: id, topic })))
              .execute()
          }
        })

        return { userId: id, topics }
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to update user preferences')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )

  // ---- POST /:id/push-token -----------------------------------------------

  fastify.post<{ Params: { id: string }; Body: { pushToken: string } }>(
    '/:id/push-token',
    {
      schema: {
        body: pushTokenBodySchema,
        response: { 200: pushTokenResponseSchema },
      },
    },
    async (request): Promise<{ success: true }> => {
      const { id } = request.params
      const { pushToken } = request.body
      try {
        const result = await db
          .updateTable('users')
          .set({ push_token: pushToken })
          .where('id', '=', id)
          .executeTakeFirst()

        if (result.numUpdatedRows === 0n) {
          throw fastify.httpErrors.notFound('User not found')
        }

        return { success: true }
      } catch (err) {
        if (isHttpError(err)) throw err
        request.log.error({ err }, 'Failed to update push token')
        throw fastify.httpErrors.internalServerError()
      }
    },
  )
}
