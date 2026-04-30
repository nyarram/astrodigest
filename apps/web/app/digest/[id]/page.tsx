import type { Metadata } from 'next'
import type { Digest } from '@astrodigest/shared'
import { DigestView } from '@/app/digest/[id]/DigestView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
    const res = await fetch(`${apiUrl}/digests/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return {}

    const digest = (await res.json()) as Digest
    const summary = digest.sections.bigStory.summary
    // noUncheckedIndexedAccess: split()[0] is string | undefined
    const firstSentence = (summary.split('.')[0] ?? '').trim()

    return {
      title: `${digest.sections.bigStory.title} — AstroDigest`,
      description: firstSentence,
      alternates: {
        canonical: `/digest/${id}`,
      },
    }
  } catch {
    return {}
  }
}

export default async function DigestPage({ params }: PageProps): Promise<JSX.Element> {
  const { id } = await params
  return <DigestView id={id} />
}
