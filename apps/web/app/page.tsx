'use client'

import { useLatestDigest } from '@/lib/queries'
import { DigestBody, DigestErrorState, DigestSkeleton } from '@/components/DigestBody'

export default function HomePage(): JSX.Element {
  const { data: digest, isLoading, isError } = useLatestDigest()

  if (isLoading) return <DigestSkeleton />
  if (isError || digest === undefined) return <DigestErrorState />
  return <DigestBody digest={digest} isLatest />
}
