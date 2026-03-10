import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types.js'

const connectionString = process.env.NEON_DATABASE_URL

if (!connectionString) {
  throw new Error('Missing required environment variable: NEON_DATABASE_URL')
}

const pool = new pg.Pool({ connectionString })

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})
