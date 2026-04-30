import { Pool } from '@neondatabase/serverless'
import { Kysely, PostgresDialect } from 'kysely'
import type { Database } from '@astrodigest/database'

const connectionString = process.env['NEON_DATABASE_URL']

if (!connectionString) {
  throw new Error('Missing required environment variable: NEON_DATABASE_URL')
}

const pool = new Pool({ connectionString })

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})
