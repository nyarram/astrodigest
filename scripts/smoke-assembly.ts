/**
 * Smoke test for DigestAssembler against the real Neon dev DB.
 * Runs with dryRun=true so no BullMQ delivery job is enqueued.
 *
 * Usage (from monorepo root):
 *   npx tsx scripts/smoke-assembly.ts
 *
 * Requires .env.local at the monorepo root with at minimum:
 *   NEON_DATABASE_URL=...
 *
 * tsx processes this file as CommonJS (no "type":"module" in root package.json),
 * so dotenv.config() runs before @astrodigest/database initialises its pool.
 */

// Must be first — loaded before any workspace package reads process.env
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import pino from 'pino'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type IORedis from 'ioredis'
import type { Database } from '@astrodigest/database'
import { DigestAssembler } from '../packages/digest-assembly/src/assembler.js'

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

const logger = pino(
  process.env['NODE_ENV'] !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: 'info' },
)

const neonUrl = process.env['NEON_DATABASE_URL']
if (!neonUrl) {
  throw new Error('NEON_DATABASE_URL is not set — check that .env.local exists and is populated')
}

const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: neonUrl }) }),
})

// dryRun=true means the delivery Queue is never instantiated, so the Redis
// client is never used.  Passing a stub satisfies the constructor signature.
const fakeRedis = {} as unknown as IORedis

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  logger.info('smoke test started (dryRun=true — no delivery job enqueued)')

  const assembler = new DigestAssembler(db, fakeRedis, logger)
  const digestId = await assembler.assemble({ dryRun: true })

  const row = await db
    .selectFrom('digests')
    .select(['id', 'sections'])
    .where('id', '=', digestId)
    .executeTakeFirstOrThrow()

  const sections: unknown = row.sections !== null ? JSON.parse(row.sections) : null

  // Use console.log for the structured output so it isn't swallowed by pino.
  process.stdout.write(`\nDigest ID: ${digestId}\n`)
  process.stdout.write(`\nSections:\n${JSON.stringify(sections, null, 2)}\n`)
}

main()
  .catch((err: unknown) => {
    logger.error({ err }, 'smoke test failed')
    process.exitCode = 1
  })
  .finally(() => void db.destroy())
