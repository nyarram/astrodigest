import { config } from 'dotenv'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load root .env so NEON_DATABASE_URL is available
config({ path: join(__dirname, '..', '..', '..', '.env') })

execSync('node-pg-migrate up --database-url-var NEON_DATABASE_URL', {
  stdio: 'inherit',
  cwd: join(__dirname, '..'),
  env: process.env,
})
