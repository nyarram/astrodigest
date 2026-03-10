import type { RawContentInsert } from '@astrodigest/shared'

/**
 * SpaceX does not publish an RSS feed or public JSON API for updates.
 * The updates page (spacex.com/updates) is a client-side rendered React app;
 * fetching its HTML yields no parseable article data.
 *
 * TODO: Replace this stub with a real integration once a feed URL or API
 * endpoint becomes available.
 */
export async function fetchSpacex(): Promise<RawContentInsert[]> {
  console.warn(
    '[spacex] SpaceX does not provide an RSS feed. ' +
      'A manual RSS URL or API integration is required for this source. Skipping.',
  )
  return []
}
