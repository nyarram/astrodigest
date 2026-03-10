import type { RawContentInsert } from '@astrodigest/shared'
import { parseRssFeed } from '../utils/rss.js'

const NSF_RSS_URL = 'https://www.nasaspaceflight.com/feed/'

export async function fetchNasaSpaceflight(): Promise<RawContentInsert[]> {
  return parseRssFeed(NSF_RSS_URL, 'nasaspaceflight')
}
