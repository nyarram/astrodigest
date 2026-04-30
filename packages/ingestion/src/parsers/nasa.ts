import type { RawContentInsert } from '@astrodigest/shared'

const APOD_BASE = 'https://api.nasa.gov/planetary/apod'

interface ApodItem {
  date: string
  title: string
  explanation: string
  url: string
  hdurl?: string
  media_type: string
}

function parseDate(str: string): Date | undefined {
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

export async function fetchNasa(apiKey: string): Promise<RawContentInsert[]> {
  const url = `${APOD_BASE}?api_key=${apiKey}&count=5`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NASA APOD fetch failed: ${response.status} ${response.statusText}`)
  }
  const items = (await response.json()) as ApodItem[]

  return items.map((item): RawContentInsert => {
    // Construct canonical APOD page URL from date: "2024-03-15" → ap240315.html
    const dateSlug = item.date.replace(/-/g, '').slice(2)
    const apodUrl = `https://apod.nasa.gov/apod/ap${dateSlug}.html`
    const image_url = item.hdurl ?? item.url
    const published_at = parseDate(item.date)

    return {
      source: 'nasa',
      source_id: item.date,
      title: item.title,
      abstract: item.explanation,
      url: apodUrl,
      image_url,
      ...(published_at !== undefined ? { published_at } : {}),
    }
  })
}
