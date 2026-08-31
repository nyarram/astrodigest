import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types.js'

const connectionString = process.env.NEON_DATABASE_URL

if (!connectionString) {
  throw new Error('Missing required environment variable: NEON_DATABASE_URL')
}

// Keep idle connections short-lived so Neon's compute can autosuspend
// between the pipeline's infrequent bursts of work — a lingering idle
// connection keeps the Free-plan compute awake and burns compute-hours.
const pool = new pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10_000,
})

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})
