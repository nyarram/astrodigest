function stripCdata(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function clean(str: string): string {
  return unescapeHtml(stripCdata(str)).trim()
}

/**
 * Returns the cleaned text content of the first matching tag,
 * or null if not found.
 */
export function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  if (!match) return null
  const content = match[1]
  if (content === undefined) return null
  return clean(content)
}

/**
 * Returns the raw inner XML of every matching tag (not cleaned, so
 * callers can further parse nested elements with extractTag).
 */
export function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi')
  const results: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const content = match[1]
    if (content !== undefined) results.push(content)
  }
  return results
}

/**
 * Returns the value of `attr` on the first occurrence of `tag`,
 * or null if not found. Works for both regular and self-closing tags.
 */
export function extractAttribute(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i')
  const match = xml.match(regex)
  if (!match) return null
  const value = match[1]
  return value !== undefined ? value : null
}
