import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import healthRoutes from './routes/health.js'
import digestRoutes from './routes/digests.js'
import userRoutes from './routes/users.js'

const REQUIRED_ENV = ['NEON_DATABASE_URL', 'UPSTASH_REDIS_URL', 'UPSTASH_REDIS_TOKEN'] as const

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
}

async function start(): Promise<void> {
  validateEnv()

  const PORT = parseInt(process.env['PORT'] ?? '3000', 10)

  const fastify = Fastify({
    logger:
      process.env['NODE_ENV'] !== 'production'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
  })

  await fastify.register(cors, { origin: true })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(sensible)

  await fastify.register(healthRoutes)
  await fastify.register(digestRoutes, { prefix: '/digests' })
  await fastify.register(userRoutes, { prefix: '/users' })

  process.on('SIGTERM', () => {
    fastify.log.info('SIGTERM received, shutting down')
    fastify.close().then(() => process.exit(0))
  })

  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  fastify.log.info(`AstroDigest API running on port ${PORT}`)
}

start().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
