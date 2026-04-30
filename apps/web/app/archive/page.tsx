import { Suspense } from 'react'
import { ArchiveView, ArchiveSkeleton } from '@/app/archive/ArchiveView'

export const metadata = {
  title: 'Archive — AstroDigest',
  description: 'All past weekly astronomy digests.',
}

export default function ArchivePage(): JSX.Element {
  return (
    // useSearchParams() inside ArchiveView requires a Suspense boundary
    <Suspense fallback={<ArchiveSkeleton />}>
      <ArchiveView />
    </Suspense>
  )
}
