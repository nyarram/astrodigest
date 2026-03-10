import type { RawContentInsert } from '@astrodigest/shared'
import { parseRssFeed } from '../utils/rss.js'

const ESO_RSS_URL = 'https://www.eso.org/public/news/feed/'

export async function fetchEso(): Promise<RawContentInsert[]> {
  return parseRssFeed(ESO_RSS_URL, 'eso')
}
