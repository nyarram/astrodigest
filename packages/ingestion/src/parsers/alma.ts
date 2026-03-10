import type { RawContentInsert } from '@astrodigest/shared'
import { parseRssFeed } from '../utils/rss.js'

const ALMA_RSS_URL = 'https://www.almaobservatory.org/feed/'

export async function fetchAlma(): Promise<RawContentInsert[]> {
  return parseRssFeed(ALMA_RSS_URL, 'alma')
}
