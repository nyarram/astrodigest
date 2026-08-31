import type { FastifyInstance } from 'fastify'
import { db } from '../lib/db.js'
import { redisClient } from '../lib/redis.js'

const CHECK_TIMEOUT_MS = 2000

// The DB probe hits Neon, which resets its scale-to-zero timer. The Free
// plan's timer is fixed at 5 minutes and cannot be shortened, so to let the
// compute actually suspend, the probe must run less often than that regardless
// of how aggressively an external monitor polls /health. Cache it for 10 min.
const DB_CHECK_TTL_MS = 10 * 60_000

let dbCheck: { ok: boolean; at: number } | null = null

async function checkDb(): Promise<boolean> {
  if (dbCheck !== null && Date.now() - dbCheck.at < DB_CHECK_TTL_MS) {
    return dbCheck.ok
  }

  let ok = true
  try {
    await withTimeout(db.selectFrom('digests').select('id').limit(1).execute(), CHECK_TIMEOUT_MS)
  } catch {
    ok = false
  }

  dbCheck = { ok, at: Date.now() }
  return ok
}

async function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('check timed out')), ms)
  })
  try {
    await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  db: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  db: { type: 'string' },
                  redis: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const checks = { db: 'ok', redis: 'ok' }

      if (!(await checkDb())) {
        checks.db = 'error'
        request.log.error('[health] DB check failed')
      }

      try {
        await withTimeout(redisClient.ping(), CHECK_TIMEOUT_MS)
      } catch (err) {
        checks.redis = 'error'
        request.log.error({ err }, '[health] Redis check failed')
      }

      const healthy = checks.db === 'ok' && checks.redis === 'ok'
      if (!healthy) {
        reply.code(503)
      }

      return {
        status: healthy ? 'ok' : 'degraded',
        service: 'astrodigest-api',
        timestamp: new Date().toISOString(),
        checks,
      }
    },
  )
}
