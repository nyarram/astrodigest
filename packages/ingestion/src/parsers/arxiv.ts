import type { RawContentInsert } from '@astrodigest/shared'
import { extractAllTags, extractTag } from '../utils/xml.js'

const ARXIV_URL =
  'https://export.arxiv.org/api/query?search_query=cat:astro-ph&sortBy=submittedDate&sortOrder=descending&max_results=20'

function extractArxivId(idUrl: string): string {
  // e.g. "http://arxiv.org/abs/2403.12345v1" → "2403.12345"
  const match = idUrl.match(/abs\/([^v\s]+)/)
  return match?.[1] ?? idUrl
}

function parseDate(str: string): Date | undefined {
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

export async function fetchArxiv(): Promise<RawContentInsert[]> {
  const response = await fetch(ARXIV_URL)
  if (!response.ok) {
    throw new Error(`arXiv fetch failed: ${response.status} ${response.statusText}`)
  }
  const xml = await response.text()
  const entries = extractAllTags(xml, 'entry')

  const results: RawContentInsert[] = []

  for (const entry of entries) {
    const idUrl = extractTag(entry, 'id')
    const title = extractTag(entry, 'title')

    if (!idUrl || !title) continue

    const source_id = extractArxivId(idUrl)
    // Strip version suffix so the URL is stable across re-runs
    const url = idUrl.replace(/v\d+$/, '')
    const abstract = extractTag(entry, 'summary')
    const publishedStr = extractTag(entry, 'published')
    const published_at = publishedStr !== null ? parseDate(publishedStr) : undefined

    results.push({
      source: 'arxiv',
      source_id,
      title,
      url,
      ...(abstract !== null ? { abstract } : {}),
      ...(published_at !== undefined ? { published_at } : {}),
    })
  }

  return results
}
