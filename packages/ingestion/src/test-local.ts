/**
 * Local test script — runs all parsers directly in Node.js and prints results.
 * Does NOT write to the database.
 *
 * Usage: npm run test:local  (from packages/ingestion)
 * Requires NASA_API_KEY in ../../.env (loaded via --env-file flag in the npm script).
 */

// process is a Node.js global; declare the slice we need here since tsconfig
// targets the Workers runtime and doesn't include @types/node.
declare const process: { env: Record<string, string | undefined> }

import type { RawContentInsert } from '@astrodigest/shared'
import { fetchAlma } from './parsers/alma.js'
import { fetchArxiv } from './parsers/arxiv.js'
import { fetchEso } from './parsers/eso.js'
import { fetchNasa } from './parsers/nasa.js'
import { fetchNasaSpaceflight } from './parsers/nasaspaceflight.js'
import { fetchSpacex } from './parsers/spacex.js'

function printResult(items: RawContentInsert[]): void {
  const first = items[0]
  if (first) {
    console.log(`  title      : ${first.title.slice(0, 80)}`)
    console.log(`  url        : ${first.url}`)
    console.log(`  source_id  : ${first.source_id}`)
  } else {
    console.log('  (no items returned)')
  }
  console.log(`  total      : ${items.length}`)
}

const nasaKey = process.env['NASA_API_KEY']

const sources: Array<{ name: string; fetch: () => Promise<RawContentInsert[]> }> = [
  { name: 'arxiv', fetch: fetchArxiv },
  {
    name: 'nasa',
    fetch: nasaKey
      ? () => fetchNasa(nasaKey)
      : async () => {
          console.log('  (skipped — NASA_API_KEY not set)')
          return []
        },
  },
  { name: 'eso', fetch: fetchEso },
  { name: 'alma', fetch: fetchAlma },
  { name: 'nasaspaceflight', fetch: fetchNasaSpaceflight },
  { name: 'spacex', fetch: fetchSpacex },
]

void (async () => {
  const results = await Promise.allSettled(sources.map((s) => s.fetch()))

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const result = results[i]
    if (!source || !result) continue

    console.log(`\n── ${source.name} ─────────────────────────────`)
    if (result.status === 'fulfilled') {
      printResult(result.value)
    } else {
      console.error(`  ERROR: ${String(result.reason)}`)
    }
  }
})()
