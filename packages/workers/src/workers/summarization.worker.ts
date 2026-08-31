import { Worker } from 'bullmq'
import Groq from 'groq-sdk'
import { db } from '@astrodigest/database'
import {
  bullmqConnection,
  defaultWorkerOptions,
  summarizationQueue,
  editorialQueue,
} from '../queues.js'
import { logger } from '../logger.js'
import type { SummarizationJob, EditorialJob } from '../queues.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ---------------------------------------------------------------------------
// Model name mapping
// ---------------------------------------------------------------------------

const GROQ_MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'openai/gpt-oss-120b',
  'claude-sonnet-4-6': 'openai/gpt-oss-120b',
}

function toGroqModel(model: string): string {
  return GROQ_MODEL_MAP[model] ?? model
}

/**
 * Defensive strip of any `<think>…</think>` reasoning block that leaks into
 * the visible content (e.g. if a model ignores `reasoning_format: 'hidden'`).
 */
function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '')
}

// ---------------------------------------------------------------------------
// Prompt name by model
// ---------------------------------------------------------------------------

function promptNameForModel(model: SummarizationJob['model']): string {
  return model === 'claude-sonnet-4-6' ? 'big_story' : 'quick_hit'
}

// ---------------------------------------------------------------------------
// Template variable substitution
// ---------------------------------------------------------------------------

function renderPrompt(template: string, job: SummarizationJob): string {
  return template
    .replaceAll('{{source}}', job.source)
    .replaceAll('{{title}}', job.title)
    .replaceAll('{{abstract}}', job.abstract ?? 'No abstract available')
    .replaceAll('{{url}}', job.url)
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function scoreConfidence(text: string): number {
  let score = 0

  if (text.length >= 100) score += 0.4
  if (text.length >= 200) score += 0.2
  if (!text.includes('I cannot') && !text.includes("I don't")) score += 0.2
  if (!text.startsWith('I ')) score += 0.1
  if (/\d/.test(text) || /[A-Z][a-z]/.test(text)) score += 0.1

  return score
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const summarizationWorker = new Worker<SummarizationJob>(
  summarizationQueue.name,
  async (job) => {
    const { rawContentId, title, model } = job.data

    try {
      // 1. Fetch the active prompt version for this model type
      const promptName = promptNameForModel(model)
      const promptVersion = await db
        .selectFrom('prompt_versions')
        .select(['id', 'prompt_template'])
        .where('name', '=', promptName)
        .where('active', '=', true)
        .executeTakeFirstOrThrow()

      // 2. Render template variables
      const prompt = renderPrompt(promptVersion.prompt_template, job.data)

      // 3. Call Groq API
      //    openai/gpt-oss-120b is a reasoning model: its chain-of-thought is
      //    billed against the completion-token budget. `reasoning_format:
      //    'hidden'` keeps the reasoning out of `message.content`, and a
      //    higher `max_completion_tokens` leaves room for the visible answer
      //    after the model finishes thinking — otherwise `content` comes back
      //    empty with finish_reason 'length' and every job fails.
      const groqModel = toGroqModel(model)
      const completion = await groq.chat.completions.create({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 4000,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
      })

      const summaryText = stripReasoning(completion.choices[0]?.message.content ?? '').trim()

      if (!summaryText) {
        throw new Error(`Groq returned no text for rawContentId=${rawContentId}`)
      }

      // 4. Confidence score
      const confidenceScore = scoreConfidence(summaryText)

      // 5. Insert into processed_content
      const isSonnet = model === 'claude-sonnet-4-6'
      const inputTokens = completion.usage?.prompt_tokens ?? 0
      const outputTokens = completion.usage?.completion_tokens ?? 0
      const inserted = await db
        .insertInto('processed_content')
        .values({
          raw_content_id: rawContentId,
          summary_short: summaryText,
          summary_long: isSonnet ? summaryText : null,
          prompt_version_id: promptVersion.id,
          model_used: model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          confidence_score: confidenceScore,
          flagged: confidenceScore < 0.6,
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      // 6. Enqueue to editorial-queue
      const editorialPayload: EditorialJob = {
        rawContentId,
        processedContentId: inserted.id,
      }
      await editorialQueue.add('editorial', editorialPayload)

      // 7. Log
      const label = title.slice(0, 50)
      logger.info(
        `[summarization] ${label} → ${model} → tokens: ${inputTokens}/${outputTokens} → confidence: ${confidenceScore.toFixed(2)}`,
      )
    } catch (err) {
      logger.error({ err, jobId: job.id, rawContentId }, '[summarization] job failed')

      await db
        .updateTable('raw_content')
        .set({ status: 'failed' })
        .where('id', '=', rawContentId)
        .execute()
        .catch((dbErr) => {
          logger.error(
            { err: dbErr, rawContentId },
            '[summarization] failed to mark raw_content as failed',
          )
        })

      throw err
    }
  },
  { connection: bullmqConnection, ...defaultWorkerOptions },
)

summarizationWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, '[summarization] worker reported job failure')
})
