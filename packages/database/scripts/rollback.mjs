import pg from 'pg'
import { readFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rollbackDir = join(__dirname, '..', 'migrations', 'rollback')

const { Client } = pg
const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })

await client.connect()

// Find the last applied migration
const { rows } = await client.query(
  'SELECT name FROM pgmigrations ORDER BY run_on DESC LIMIT 1'
)

if (rows.length === 0) {
  console.log('No migrations to roll back.')
  await client.end()
  process.exit(0)
}

const lastName = rows[0].name
const rollbackFile = join(rollbackDir, `${lastName}.down.sql`)

let sql
try {
  sql = await readFile(rollbackFile, 'utf8')
} catch {
  console.error(`No rollback file found for migration "${lastName}" at ${rollbackFile}`)
  await client.end()
  process.exit(1)
}

console.log(`Rolling back: ${lastName}`)
await client.query('BEGIN')
try {
  await client.query(sql)
  await client.query('DELETE FROM pgmigrations WHERE name = $1', [lastName])
  await client.query('COMMIT')
  console.log(`Rolled back: ${lastName}`)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Rollback failed:', err.message)
  await client.end()
  process.exit(1)
}

await client.end()
