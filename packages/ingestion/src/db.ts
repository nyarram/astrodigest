import { Pool } from '@neondatabase/serverless'
import { Kysely, PostgresDialect } from 'kysely'
import type { Generated } from 'kysely'
import type { IngestResult, RawContentInsert, SourceType } from '@astrodigest/shared'
import type { Env } from './types.js'

// Mirrors packages/database/src/types.ts RawContentTable.
// Defined locally to avoid importing @astrodigest/database (which depends on
// the Node-only pg package and cannot be bundled for Cloudflare Workers).
interface RawContentRow {
  id: Generated<string>
  source: string
  source_id: string
  title: string
  abstract: string | null
  url: string
  image_url: string | null
  relevance_score: Generated<number | null> // set later by scoring worker
  published_at: Date | null
  ingested_at: Generated<Date>
  status: Generated<string>
}

interface LocalDatabase {
  raw_content: RawContentRow
}

function createDb(connectionString: string): Kysely<LocalDatabase> {
  const pool = new Pool({ connectionString })
  return new Kysely<LocalDatabase>({
    dialect: new PostgresDialect({ pool }),
  })
}

export async function insertRawContent(items: RawContentInsert[], env: Env): Promise<IngestResult> {
  // All items in a batch share the same source; fall back to 'arxiv' only for
  // the empty-array case so the return type is always a valid SourceType.
  const source: SourceType = items[0]?.source ?? 'arxiv'

  const result: IngestResult = {
    source,
    fetched: items.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  if (items.length === 0) return result

  const db = createDb(env.NEON_DATABASE_URL)

  for (const item of items) {
    try {
      const existing = await db
        .selectFrom('raw_content')
        .select('id')
        .where('source', '=', item.source)
        .where('source_id', '=', item.source_id)
        .executeTakeFirst()

      if (existing !== undefined) {
        result.skipped++
        continue
      }

      await db
        .insertInto('raw_content')
        .values({
          source: item.source,
          source_id: item.source_id,
          title: item.title,
          url: item.url,
          // Optional fields on RawContentInsert coerced to null for the DB column
          abstract: item.abstract ?? null,
          image_url: item.image_url ?? null,
          published_at: item.published_at ?? null,
          status: 'pending',
        })
        .execute()

      result.inserted++
    } catch (err) {
      result.failed++
      result.errors.push(
        err instanceof Error
          ? err.message
          : `Unknown error inserting ${item.source}:${item.source_id}`,
      )
    }
  }

  return result
}
