import IORedis from 'ioredis'
import { db } from '@astrodigest/database'
import { logger } from './logger.js'
import { DigestAssembler } from './assembler.js'

// ---------------------------------------------------------------------------
// Redis connection (BullMQ requires an ioredis TCP connection)
// ---------------------------------------------------------------------------

function resolveRedisUrl(): string {
  const url = process.env['REDIS_URL']
  if (!url) {
    throw new Error('Missing required environment variable: REDIS_URL')
  }
  return url
}

const redisClient = new IORedis(resolveRedisUrl(), {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
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
