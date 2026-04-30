import { Pool, neonConfig } from '@neondatabase/serverless'
import { Kysely, PostgresDialect } from 'kysely'
import ws from 'ws'
import type { Database } from '@astrodigest/database'

// Required for @neondatabase/serverless Pool in Node.js environments
neonConfig.webSocketConstructor = ws

const connectionString = process.env['NEON_DATABASE_URL']

if (!connectionString) {
  throw new Error('Missing required environment variable: NEON_DATABASE_URL')
}

const pool = new Pool({ connectionString })

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})
