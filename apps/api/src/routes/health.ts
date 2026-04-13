import type { FastifyInstance } from 'fastify'

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      service: 'astrodigest-api',
      timestamp: new Date().toISOString(),
    }),
  )
}
