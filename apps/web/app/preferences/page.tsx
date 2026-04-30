'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { useUserPreferences, useSavePreferences } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { SourceBadge } from '@/components/SourceBadge'
import { cn } from '@/lib/utils'
import type { SourceType, UserPreferences } from '@astrodigest/shared'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = [
  'exoplanets',
  'black holes',
  'solar system',
  'cosmology',
  'space missions',
  'astrobiology',
] as const

const SOURCES: SourceType[] = ['nasa', 'eso', 'alma', 'arxiv', 'nasaspaceflight']

const RELEVANCE_MIN = 0.3
const RELEVANCE_MAX = 0.9
const RELEVANCE_STEP = 0.1

const DEFAULT_PREFS: UserPreferences = {
  sources: ['nasa', 'eso', 'arxiv'],
  topics: ['exoplanets', 'space missions'],
  deliveryDay: 'monday',
  deliveryTime: '09:00',
  timezone: 'UTC',
  minRelevanceScore: 0.7,
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Checkbox pill ────────────────────────────────────────────────────────────

function CheckPill({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        checked
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreferencesPage(): JSX.Element {
  const { userId } = useAuth()
  const { user } = useUser()
  const { data: savedPrefs } = useUserPreferences(userId ?? '')
  const savePreferences = useSavePreferences()

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS)
  const [isDirty, setIsDirty] = useState(false)

  // Populate form once saved prefs load (merge over defaults to satisfy required fields)
  useEffect(() => {
    if (savedPrefs !== undefined) {
      setPrefs({ ...DEFAULT_PREFS, ...savedPrefs })
      setIsDirty(false)
    }
  }, [savedPrefs])

  function toggleTopic(topic: string): void {
    setIsDirty(true)
    setPrefs((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }))
  }

  function toggleSource(source: SourceType): void {
    setIsDirty(true)
    setPrefs((prev) => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter((s) => s !== source)
        : [...prev.sources, source],
    }))
  }

  function handleRelevanceChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setIsDirty(true)
    setPrefs((prev) => ({ ...prev, minRelevanceScore: Number(e.target.value) }))
  }

  function handleSave(): void {
    if (userId === null || userId === undefined) return
    savePreferences.mutate(
      { userId, preferences: prefs },
      {
        onSuccess: () => {
          toast.success('Preferences saved')
          setIsDirty(false)
        },
        onError: () => toast.error('Failed to save preferences'),
      },
    )
  }

  const email = user?.primaryEmailAddress?.emailAddress
  const score = prefs.minRelevanceScore ?? DEFAULT_PREFS.minRelevanceScore ?? 0.7

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Preferences</h1>
      {email !== undefined && <p className="mb-8 text-sm text-muted-foreground">{email}</p>}

      <div className="space-y-4">
        {/* Topics */}
        <Section title="Topics">
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <CheckPill
                key={topic}
                label={topic}
                checked={prefs.topics.includes(topic)}
                onChange={() => toggleTopic(topic)}
              />
            ))}
          </div>
        </Section>

        {/* Sources */}
        <Section title="Sources">
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                role="checkbox"
                aria-checked={prefs.sources.includes(source)}
                onClick={() => toggleSource(source)}
                className={cn(
                  'rounded-full border transition-colors',
                  prefs.sources.includes(source)
                    ? 'border-accent/50 opacity-100 ring-1 ring-accent/30'
                    : 'border-transparent opacity-50 hover:opacity-75',
                )}
              >
                <SourceBadge source={source} />
              </button>
            ))}
          </div>
        </Section>

        {/* Minimum relevance score */}
        <Section title="Minimum Relevance Score">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Only include stories scoring above this threshold
              </span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {score.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={RELEVANCE_MIN}
              max={RELEVANCE_MAX}
              step={RELEVANCE_STEP}
              value={score}
              onChange={handleRelevanceChange}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{RELEVANCE_MIN} (broader)</span>
              <span>(more selective) {RELEVANCE_MAX}</span>
            </div>
          </div>
        </Section>
      </div>

      {/* Save */}
      <div className="mt-8 flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={savePreferences.isPending || !isDirty}
          className="min-w-24"
        >
          {savePreferences.isPending ? 'Saving…' : 'Save'}
        </Button>
        {!isDirty && savedPrefs !== undefined && (
          <span className="text-xs text-muted-foreground">Up to date</span>
        )}
      </div>
    </main>
  )
}
