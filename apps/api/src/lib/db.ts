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

// Short idle timeout so Neon's compute can autosuspend between requests
// instead of being held awake by a pooled idle connection.
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10_000,
})

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})
