'use client'

import { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StreamingSummaryProps {
  digestId: string
  sectionKey: 'bigStory'
  initialText: string
}

export function StreamingSummary({
  digestId,
  sectionKey,
  initialText,
}: StreamingSummaryProps): JSX.Element {
  const [text, setText] = useState(initialText)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function startStream(): Promise<void> {
    if (isStreaming) {
      abortRef.current?.abort()
      return
    }

    abortRef.current = new AbortController()
    setIsStreaming(true)
    setText('')

    try {
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/digests/${digestId}/stream?section=${sectionKey}`, {
        signal: abortRef.current.signal,
      })

      if (!response.ok || response.body === null) {
        setText(initialText)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setText((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      // AbortError is intentional (user clicked stop or component unmounted)
      if ((err as Error).name !== 'AbortError') {
        setText(initialText)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => void startStream()}
        className={cn(
          'gap-1.5 text-muted-foreground hover:text-foreground',
          isStreaming && 'opacity-70',
        )}
      >
        <RotateCcw className={cn('size-3', isStreaming && 'animate-spin')} />
        {isStreaming ? 'Streaming…' : 'Re-stream'}
      </Button>
    </div>
  )
}
