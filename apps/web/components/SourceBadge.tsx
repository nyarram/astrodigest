import { cn } from '@/lib/utils'
import type { SourceType } from '@astrodigest/shared'

interface SourceConfig {
  label: string
  classes: string
}

const SOURCE_CONFIG: Record<SourceType, SourceConfig> = {
  nasa: { label: 'NASA', classes: 'bg-blue-500/10 text-blue-400' },
  eso: { label: 'ESO', classes: 'bg-purple-500/10 text-purple-400' },
  alma: { label: 'ALMA', classes: 'bg-teal-500/10 text-teal-400' },
  arxiv: { label: 'arXiv', classes: 'bg-orange-500/10 text-orange-400' },
  spacex: { label: 'SpaceX', classes: 'bg-red-500/10 text-red-400' },
  nasaspaceflight: { label: 'NSF', classes: 'bg-zinc-500/10 text-zinc-400' },
  spaceflightnow: { label: 'Spaceflight Now', classes: 'bg-zinc-500/10 text-zinc-400' },
  planetary: { label: 'Planetary Society', classes: 'bg-green-500/10 text-green-400' },
}

interface SourceBadgeProps {
  source: SourceType
  className?: string
}

export function SourceBadge({ source, className }: SourceBadgeProps): JSX.Element {
  const { label, classes } = SOURCE_CONFIG[source]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        classes,
        className,
      )}
    >
      {label}
    </span>
  )
}
