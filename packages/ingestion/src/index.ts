import type { IngestResult, RawContentInsert } from '@astrodigest/shared'
import { insertRawContent } from './db.js'
import { fetchAlma } from './parsers/alma.js'
import { fetchArxiv } from './parsers/arxiv.js'
import { fetchEso } from './parsers/eso.js'
import { fetchNasa } from './parsers/nasa.js'
import { fetchNasaSpaceflight } from './parsers/nasaspaceflight.js'
import { fetchSpacex } from './parsers/spacex.js'
import type { Env } from './types.js'

async function runSource(
  fetcher: () => Promise<RawContentInsert[]>,
  env: Env,
): Promise<IngestResult> {
  const items = await fetcher()
  return insertRawContent(items, env)
}

async function runIngestion(env: Env): Promise<void> {
  const results = await Promise.allSettled([
    runSource(() => fetchArxiv(), env),
    runSource(() => fetchNasa(env.NASA_API_KEY), env),
    runSource(() => fetchEso(), env),
    runSource(() => fetchAlma(), env),
    runSource(() => fetchNasaSpaceflight(), env),
    runSource(() => fetchSpacex(), env),
  ])

  let totalFetched = 0
  let totalInserted = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const r = result.value
      console.log(
        `[${r.source}] fetched: ${r.fetched} inserted: ${r.inserted} skipped: ${r.skipped} failed: ${r.failed}`,
      )
      if (r.errors.length > 0) {
        for (const err of r.errors) {
          console.error(`[${r.source}] error: ${err}`)
        }
      }
      totalFetched += r.fetched
      totalInserted += r.inserted
      totalSkipped += r.skipped
      totalFailed += r.failed
    } else {
      console.error(`[ingestion] source pipeline failed: ${String(result.reason)}`)
    }
  }

  console.log(
    `[ingestion] total — fetched: ${totalFetched} inserted: ${totalInserted} skipped: ${totalSkipped} failed: ${totalFailed}`,
  )
}

export default {
  async fetch(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', service: 'astrodigest-ingestion' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runIngestion(env))
  },
} satisfies ExportedHandler<Env>
