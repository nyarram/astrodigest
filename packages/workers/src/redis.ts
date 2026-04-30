import { Redis } from '@upstash/redis'

const url = process.env['UPSTASH_REDIS_URL']
const token = process.env['UPSTASH_REDIS_TOKEN']

if (!url) {
  throw new Error('Missing required environment variable: UPSTASH_REDIS_URL')
}
if (!token) {
  throw new Error('Missing required environment variable: UPSTASH_REDIS_TOKEN')
}

export const redis = new Redis({ url, token })
