import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ExternalLink, Telescope } from 'lucide-react'
import type { Digest, QuickHit, SpaceNewsItem } from '@astrodigest/shared'
import { SourceBadge } from '@/components/SourceBadge'
import { StreamingSummary } from '@/components/StreamingSummary'
import { cn } from '@/lib/utils'

// ─── Shared sub-components ────────────────────────────────────────────────────

function RelevancePill({ score }: { score: number }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs',
        score >= 0.9 ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground',
      )}
    >
      {score.toFixed(2)} relevance
    </span>
  )
}

function ExternalLinkAnchor({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent transition-colors hover:text-accent/80"
    >
      {label}
      <ExternalLink className="size-3.5" />
    </Link>
  )
}

function Divider(): JSX.Element {
  return <hr className="mb-12 border-border" />
}

function QuickHitCard({ hit }: { hit: QuickHit }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <SourceBadge source={hit.source} />
      <h3 className="text-sm font-semibold leading-snug text-foreground">{hit.title}</h3>
      <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{hit.summary}</p>
      <ExternalLinkAnchor href={hit.sourceUrl} label="Read more" />
    </div>
  )
}

function SpaceNewsRow({ item }: { item: SpaceNewsItem }): JSX.Element {
  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
      </div>
      <Link
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read: ${item.title}`}
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowUpRight className="size-4" />
      </Link>
    </li>
  )
}

function formatWeek(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Shared loading/error states ─────────────────────────────────────────────

export function DigestSkeleton(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl animate-pulse px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-4 w-40 rounded-full bg-muted" />
        <div className="h-5 w-28 rounded-full bg-muted" />
      </div>
      <div className="mb-12 space-y-4">
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <div className="h-9 w-3/4 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border p-4">
            <div className="h-4 w-14 rounded-full bg-muted" />
            <div className="h-5 w-full rounded bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-full rounded bg-muted" />
              <div className="h-3.5 w-full rounded bg-muted" />
              <div className="h-3.5 w-4/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="mb-12 aspect-video w-full overflow-hidden rounded-xl bg-muted" />
      <div className="space-y-3 rounded-xl border border-border p-5">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>
    </main>
  )
}

export function DigestErrorState(): JSX.Element {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-32 text-center">
      <Telescope className="mb-4 size-12 text-muted-foreground" />
      <h2 className="mb-2 text-lg font-semibold">No digest available</h2>
      <p className="text-sm text-muted-foreground">
        The latest digest hasn&apos;t been assembled yet. Check back after the weekly pipeline runs.
      </p>
    </main>
  )
}

// ─── Main body ────────────────────────────────────────────────────────────────

interface DigestBodyProps {
  digest: Digest
  isLatest?: boolean
  showBackLink?: boolean
}

export function DigestBody({
  digest,
  isLatest = false,
  showBackLink = false,
}: DigestBodyProps): JSX.Element {
  const { id, weekStart, sections } = digest
  const { bigStory, quickHits, imageOfWeek, paperDeepDive, spaceNews } = sections

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {showBackLink && (
        <Link
          href="/archive"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All digests
        </Link>
      )}

      {/* Week header */}
      <div className={cn('flex flex-wrap items-center gap-3', showBackLink ? 'mb-6' : 'mb-8')}>
        <span className="text-sm text-muted-foreground">Week of {formatWeek(weekStart)}</span>
        {isLatest && (
          <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold tracking-widest text-accent">
            LATEST DIGEST
          </span>
        )}
      </div>

      {/* Big Story */}
      <section className="mb-12">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SourceBadge source={bigStory.source} />
          {bigStory.relevanceScore !== undefined && (
            <RelevancePill score={bigStory.relevanceScore} />
          )}
        </div>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground">
          {bigStory.title}
        </h1>
        <StreamingSummary digestId={id} sectionKey="bigStory" initialText={bigStory.summary} />
        <div className="mt-4">
          <ExternalLinkAnchor href={bigStory.sourceUrl} label="Read original" />
        </div>
      </section>

      <Divider />

      {/* Quick Hits */}
      <section className="mb-12">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quick Hits
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickHits.map((hit, i) => (
            <QuickHitCard key={i} hit={hit} />
          ))}
        </div>
      </section>

      <Divider />

      {/* Image of the Week */}
      <section className="mb-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Image of the Week
        </h2>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={imageOfWeek.imageUrl}
            alt={imageOfWeek.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            // unoptimized until remotePatterns configured in next.config.ts for NASA/ESO domains
            unoptimized
          />
        </div>
        <div className="mt-3">
          <p className="font-medium text-foreground">{imageOfWeek.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {imageOfWeek.description}
          </p>
          {imageOfWeek.credit !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground/60">Credit: {imageOfWeek.credit}</p>
          )}
        </div>
      </section>

      <Divider />

      {/* Paper Deep Dive */}
      <section className="mb-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Paper Deep Dive
        </h2>
        <div className="rounded-xl border border-accent/30 bg-surface p-5">
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            arXiv
          </p>
          <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground">
            {paperDeepDive.title}
          </h3>
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            {paperDeepDive.authors.join(', ')}
          </p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {paperDeepDive.summary}
          </p>
          <ExternalLinkAnchor href={paperDeepDive.arxivUrl} label="View on arXiv" />
        </div>
      </section>

      {/* Space News — only rendered when populated */}
      {spaceNews !== undefined && spaceNews.length > 0 && (
        <>
          <Divider />
          <section className="mb-12">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Space News
            </h2>
            <ul className="space-y-2">
              {spaceNews.map((item, i) => (
                <SpaceNewsRow key={i} item={item} />
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
