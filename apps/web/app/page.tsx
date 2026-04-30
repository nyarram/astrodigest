'use client'

import { useLatestDigest } from '@/lib/queries'
import { DigestErrorState, DigestSkeleton } from '@/components/DigestBody'
import { SolarDigest } from '@/components/SolarDigest'

export default function HomePage(): JSX.Element {
  const { data: digest, isLoading, isError } = useLatestDigest()

  if (isLoading) return <DigestSkeleton />
  if (isError || digest === undefined) return <DigestErrorState />
  return <SolarDigest digest={digest} />
}
