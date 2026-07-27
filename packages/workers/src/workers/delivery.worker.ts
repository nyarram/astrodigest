import { Worker } from 'bullmq'
import { db } from '@astrodigest/database'
import { bullmqConnection, deliveryQueue } from '../queues.js'
import { logger } from '../logger.js'
import type { DeliveryJob } from '../queues.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_BATCH_SIZE = 100

interface DigestSectionsShape {
  bigStory?: { title?: string }
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data: { digestId: string }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Expo push API responded ${res.status}: ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const deliveryWorker = new Worker<DeliveryJob>(
  deliveryQueue.name,
  async (job) => {
    const { digestId } = job.data

    try {
      const digest = await db
        .selectFrom('digests')
        .select(['id', 'sections'])
        .where('id', '=', digestId)
        .executeTakeFirstOrThrow()

      let headline = 'Your weekly astronomy digest is ready'
      if (digest.sections !== null) {
        try {
          const parsed = JSON.parse(digest.sections) as DigestSectionsShape
          if (parsed.bigStory?.title !== undefined) {
            headline = parsed.bigStory.title
          }
        } catch {
          // malformed sections JSON shouldn't block delivery — fall back to default headline
        }
      }

      const recipients = await db
        .selectFrom('users')
        .select(['id', 'push_token'])
        .where('push_notifications_enabled', '=', true)
        .where('push_token', 'is not', null)
        .execute()

      logger.info(
        { digestId, recipientCount: recipients.length },
        '[delivery] sending push notifications',
      )

      const messages: ExpoPushMessage[] = recipients
        .filter((r): r is { id: string; push_token: string } => r.push_token !== null)
        .map((r) => ({
          to: r.push_token,
          title: 'AstroDigest',
          body: headline,
          data: { digestId },
        }))

      for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
        try {
          await sendExpoPushBatch(batch)
        } catch (err) {
          logger.error(
            { err, digestId, batchSize: batch.length },
            '[delivery] Expo push batch failed',
          )
        }
      }

      await db
        .updateTable('digests')
        .set({ status: 'delivered', delivered_at: new Date() })
        .where('id', '=', digestId)
        .execute()

      logger.info({ digestId, sentCount: messages.length }, '[delivery] digest marked delivered')
    } catch (err) {
      logger.error({ err, jobId: job.id, digestId }, '[delivery] job failed')
      throw err
    }
  },
  { connection: bullmqConnection },
)

deliveryWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, '[delivery] worker reported job failure')
})
