'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Telescope } from 'lucide-react'
import { useDigests } from '@/lib/queries'
import { DigestCard } from '@/components/DigestCard'
import { Button } from '@/components/ui/button'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ArchiveSkeleton(): JSX.Element {
  return (
    <main className="mx-auto max-w-4xl animate-pulse px-4 py-10">
      <div className="mb-8 h-8 w-32 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border p-5">
            <div className="flex justify-between">
              <div className="h-3.5 w-28 rounded-full bg-muted" />
              <div className="h-3.5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-10 w-full rounded bg-muted" />
            <div className="flex justify-between">
              <div className="h-5 w-14 rounded-full bg-muted" />
              <div className="h-3.5 w-16 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ─── Empty / error states ─────────────────────────────────────────────────────

function EmptyState(): JSX.Element {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-32 text-center">
      <Telescope className="mb-4 size-12 text-muted-foreground" />
      <h2 className="mb-2 text-lg font-semibold">No digests yet</h2>
      <p className="text-sm text-muted-foreground">
        Digests will appear here after the first weekly pipeline run.
      </p>
    </main>
  )
}

function ErrorState(): JSX.Element {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-32 text-center">
      <Telescope className="mb-4 size-12 text-muted-foreground" />
      <h2 className="mb-2 text-lg font-semibold">Failed to load digests</h2>
      <p className="text-sm text-muted-foreground">Check your connection and try refreshing.</p>
    </main>
  )
}

// ─── Archive view ─────────────────────────────────────────────────────────────

export function ArchiveView(): JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const { data, isLoading, isError } = useDigests(page)

  function setPage(next: number): void {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (isLoading) return <ArchiveSkeleton />
  if (isError || data === undefined) return <ErrorState />
  if (data.digests.length === 0) return <EmptyState />

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit))

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">Archive</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.digests.map((digest) => (
          <DigestCard key={digest.id} digest={digest} href={`/digest/${digest.id}`} />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-10 flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={!data.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </main>
  )
}
