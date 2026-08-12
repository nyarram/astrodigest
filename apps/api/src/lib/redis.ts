import IORedis from 'ioredis'

const url = process.env['REDIS_URL']

if (!url) {
  throw new Error('Missing required environment variable: REDIS_URL')
}

export const redisClient = new IORedis(url, {
  maxRetriesPerRequest: 1,
})

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redisClient.get(key)
  if (raw === null) return null
  return JSON.parse(raw) as T
}

export async function setJSON<T>(key: string, value: T, opts: { ex: number }): Promise<void> {
  await redisClient.set(key, JSON.stringify(value), 'EX', opts.ex)
}
