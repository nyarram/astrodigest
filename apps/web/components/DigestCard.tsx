import Link from 'next/link'
import type { Digest } from '@astrodigest/shared'
import { SourceBadge } from '@/components/SourceBadge'

interface DigestCardProps {
  digest: Digest
  href: string
}

function formatRelative(dateStr: string): string {
  const diffMs = new Date(dateStr).getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86_400_000)
  const absDays = Math.abs(diffDays)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absDays < 7) return rtf.format(diffDays, 'day')
  const diffWeeks = Math.round(diffDays / 7)
  if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, 'week')
  return rtf.format(Math.round(diffDays / 30), 'month')
}

function formatWeekLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DigestCard({ digest, href }: DigestCardProps): JSX.Element {
  const { sections, weekStart, createdAt } = digest
  const quickHitCount = sections.quickHits.length

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/30 hover:bg-muted/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Week of {formatWeekLabel(weekStart)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(createdAt)}</span>
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
        {sections.bigStory.title}
      </h3>
      <div className="flex items-center justify-between gap-2">
        <SourceBadge source={sections.bigStory.source} />
        <span className="text-xs text-muted-foreground">
          {quickHitCount} quick hit{quickHitCount !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  )
}
