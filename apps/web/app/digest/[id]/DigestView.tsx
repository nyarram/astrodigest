'use client'

import { useDigest } from '@/lib/queries'
import { DigestBody, DigestErrorState, DigestSkeleton } from '@/components/DigestBody'

interface DigestViewProps {
  id: string
}

export function DigestView({ id }: DigestViewProps): JSX.Element {
  const { data: digest, isLoading, isError } = useDigest(id)

  if (isLoading) return <DigestSkeleton />
  if (isError || digest === undefined) return <DigestErrorState />
  return <DigestBody digest={digest} showBackLink />
}
