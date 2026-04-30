'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import type { Digest, BigStory, QuickHit, PaperDeepDive } from '@astrodigest/shared'
import { SourceBadge } from '@/components/SourceBadge'

// ---------------------------------------------------------------------------
// Source color mapping
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  nasa: '#60a5fa',
  eso: '#a78bfa',
  arxiv: '#fb923c',
  nasaspaceflight: '#4ade80',
  alma: '#22d3ee',
  spacex: '#94a3b8',
  planetary: '#f472b6',
  spaceflightnow: '#34d399',
}

function sourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#818cf8'
}

// ---------------------------------------------------------------------------
// Star field
// ---------------------------------------------------------------------------

interface Star {
  x: number
  y: number
  r: number
  o: number
}

function StarField(): JSX.Element {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(
      Array.from({ length: 200 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 1.5 + 0.3,
        o: Math.random() * 0.6 + 0.15,
      })),
    )
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, opacity: s.o }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Selected item union
// ---------------------------------------------------------------------------

type Selected =
  | { type: 'bigStory'; data: BigStory }
  | { type: 'quickHit'; data: QuickHit }
  | { type: 'paper'; data: PaperDeepDive }

// ---------------------------------------------------------------------------
// Story panel
// ---------------------------------------------------------------------------

function StoryPanel({ item, onClose }: { item: Selected; onClose: () => void }): JSX.Element {
  const href = item.type === 'paper' ? item.data.arxivUrl : item.data.sourceUrl
  const source = item.type === 'paper' ? 'arxiv' : item.data.source
  const linkLabel = item.type === 'paper' ? 'View on arXiv' : 'Read original'

  return (
    <div className="solar-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0c0c14] shadow-2xl md:max-w-md">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <SourceBadge source={source} />
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <h2 className="mb-4 text-xl font-bold leading-snug text-white">{item.data.title}</h2>

        {item.type === 'paper' && item.data.authors.length > 0 && (
          <p className="mb-4 font-mono text-xs text-white/40">{item.data.authors.join(', ')}</p>
        )}

        <p className="text-sm leading-relaxed text-white/65">{item.data.summary}</p>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
        >
          {linkLabel}
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Orbit planet
// ---------------------------------------------------------------------------

interface OrbitPlanetProps {
  size: number
  color: string
  orbitDiameter: number
  duration: number
  delay: number
  label: string
  isPaper?: boolean
  onClick: () => void
}

function OrbitPlanet({
  size,
  color,
  orbitDiameter,
  duration,
  delay,
  label,
  isPaper,
  onClick,
}: OrbitPlanetProps): JSX.Element {
  return (
    <div
      className="solar-orbit-track absolute"
      style={{
        width: orbitDiameter,
        height: orbitDiameter,
        top: '50%',
        left: '50%',
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    >
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className="solar-orbit-planet absolute left-1/2 top-0 focus:outline-none"
        style={{
          width: size,
          height: size,
          background: color,
          borderRadius: '50%',
          boxShadow: `0 0 ${size * 0.7}px ${size * 0.3}px ${color}44`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      >
        {isPaper && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: 'rotate(-25deg)' }}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{
                width: size * 2.3,
                height: size * 0.42,
                borderColor: `${color}55`,
                borderWidth: '1.5px',
              }}
            />
          </div>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Week header formatter
// ---------------------------------------------------------------------------

function formatWeek(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface SolarDigestProps {
  digest: Digest
}

export function SolarDigest({ digest }: SolarDigestProps): JSX.Element {
  const { sections, weekStart } = digest
  const { bigStory, quickHits, paperDeepDive } = sections
  const [selected, setSelected] = useState<Selected | null>(null)

  const innerOrbit = 320
  const outerOrbit = 520
  const innerDuration = 22
  const outerDuration = 40

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#05050d]">
      <StarField />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3">
        <span className="text-xs text-white/30">Week of {formatWeek(weekStart)}</span>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tracking-widest text-amber-400">
          LATEST DIGEST
        </span>
      </div>

      {/* Solar system arena */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* Orbit ring visuals */}
        <div
          className="pointer-events-none absolute rounded-full border border-white/[0.06]"
          style={{ width: innerOrbit, height: innerOrbit }}
        />
        <div
          className="pointer-events-none absolute rounded-full border border-white/[0.04]"
          style={{ width: outerOrbit, height: outerOrbit }}
        />

        {/* Quick hit planets — inner orbit */}
        {quickHits.map((hit, i) => (
          <OrbitPlanet
            key={`${hit.title}-${i}`}
            size={22}
            color={sourceColor(hit.source)}
            orbitDiameter={innerOrbit}
            duration={innerDuration}
            delay={-(innerDuration * i) / Math.max(quickHits.length, 1)}
            label={hit.title}
            onClick={() => setSelected({ type: 'quickHit', data: hit })}
          />
        ))}

        {/* Paper planet — outer orbit */}
        {paperDeepDive && (
          <OrbitPlanet
            size={34}
            color="#fb923c"
            orbitDiameter={outerOrbit}
            duration={outerDuration}
            delay={0}
            label={paperDeepDive.title}
            isPaper
            onClick={() => setSelected({ type: 'paper', data: paperDeepDive })}
          />
        )}

        {/* Sun — big story */}
        <button
          onClick={() => setSelected({ type: 'bigStory', data: bigStory })}
          aria-label={bigStory.title}
          className="solar-sun relative z-10 rounded-full focus:outline-none"
          style={{
            width: 72,
            height: 72,
            background: 'radial-gradient(circle at 38% 32%, #fde68a 0%, #f59e0b 45%, #b45309 100%)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="relative z-10 flex justify-center gap-6 px-4 pb-5 text-xs text-white/35">
        <button
          onClick={() => setSelected({ type: 'bigStory', data: bigStory })}
          className="flex items-center gap-1.5 transition-colors hover:text-white/60"
        >
          <span className="inline-block size-2.5 rounded-full bg-amber-400/80" />
          Big story
        </button>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-white/40" />
          Quick hits
        </span>
        {paperDeepDive && (
          <button
            onClick={() => setSelected({ type: 'paper', data: paperDeepDive })}
            className="flex items-center gap-1.5 transition-colors hover:text-white/60"
          >
            <span className="inline-block size-2.5 rounded-full bg-orange-400/80" />
            Paper deep dive
          </button>
        )}
      </div>

      {/* Overlay + panel */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <StoryPanel item={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  )
}
