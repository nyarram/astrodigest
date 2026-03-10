import type { RawContentInsert, SourceType } from '@astrodigest/shared'
import { extractAllTags, extractAttribute, extractTag } from './xml.js'
import { hashString } from './hash.js'

function parseDate(str: string): Date | undefined {
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

/**
 * Fetches an RSS 2.0 feed and normalises each <item> into a RawContentInsert.
 * Items missing a title or link are silently dropped.
 * image_url is sourced from <enclosure url="..."> or <media:content url="...">.
 * source_id is an 8-char SHA-256 hash of the item URL.
 */
export async function parseRssFeed(
  feedUrl: string,
  source: SourceType,
): Promise<RawContentInsert[]> {
  const response = await fetch(feedUrl)
  if (!response.ok) {
    throw new Error(`${source} RSS fetch failed: ${response.status} ${response.statusText}`)
  }
  const xml = await response.text()
  const items = extractAllTags(xml, 'item')

  const results = await Promise.all(
    items.map(async (item): Promise<RawContentInsert | null> => {
      const title = extractTag(item, 'title')
      // RSS 2.0 uses text content; Atom-influenced feeds use href attribute
      const link = extractTag(item, 'link') ?? extractAttribute(item, 'link', 'href')

      if (!title || !link) return null

      const source_id = await hashString(link)
      const abstract = extractTag(item, 'description')
      const pubDateStr = extractTag(item, 'pubDate')
      const published_at = pubDateStr !== null ? parseDate(pubDateStr) : undefined
      const image_url =
        extractAttribute(item, 'enclosure', 'url') ??
        extractAttribute(item, 'media:content', 'url') ??
        null

      return {
        source,
        source_id,
        title,
        url: link,
        ...(abstract !== null ? { abstract } : {}),
        ...(image_url !== null ? { image_url } : {}),
        ...(published_at !== undefined ? { published_at } : {}),
      }
    }),
  )

  return results.filter((r): r is RawContentInsert => r !== null)
}
