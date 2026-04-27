import IORedis from 'ioredis'
import { db } from '@astrodigest/database'
import { logger } from './logger.js'
import { DigestAssembler } from './assembler.js'

// ---------------------------------------------------------------------------
// Redis connection (BullMQ requires an ioredis TCP connection, not the
// @upstash/redis REST client)
// ---------------------------------------------------------------------------

function resolveRedisUrl(): string {
  const explicit = process.env['UPSTASH_REDIS_CONNECTION_URL']
  if (explicit) return explicit

  const restUrl = process.env['UPSTASH_REDIS_URL']
  const token = process.env['UPSTASH_REDIS_TOKEN']
  if (restUrl !== undefined && token !== undefined) {
    const host = restUrl.replace(/^https?:\/\//, '')
    return `rediss://default:${token}@${host}:6379`
  }

  throw new Error(
    'Missing Redis config. Set UPSTASH_REDIS_CONNECTION_URL or both UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN.',
  )
}

const redisClient = new IORedis(resolveRedisUrl(), {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  tls: {},
})

// ---------------------------------------------------------------------------
// Entry point — invoked by Railway cron, runs once and exits
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  logger.info('digest assembly started')

  const assembler = new DigestAssembler(db, redisClient, logger)
  const digestId = await assembler.assemble()

  logger.info({ digestId }, 'digest assembly finished')
}

run()
  .catch((err: unknown) => {
    logger.error({ err }, 'digest assembly failed')
    process.exitCode = 1
  })
  .finally(() => {
    void redisClient.quit()
  })
