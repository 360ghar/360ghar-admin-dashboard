import type { ReactNode } from 'react'
import { LoadingSpinner } from './loading-spinner'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  type?: 'skeleton' | 'spinner' | 'card' | 'cards' | 'table' | 'form' | 'detail' | 'stats' | 'chart'
  rows?: number
  height?: string
  columns?: number
  text?: string
  className?: string
}

export function LoadingState({
  type = 'skeleton',
  rows = 5,
  height = 'h-16',
  columns = 4,
  text = 'Loading content…',
  className,
}: LoadingStateProps) {
  if (type === 'spinner') {
    return <div className={cn('flex items-center justify-center p-8', className)}><LoadingSpinner size="lg" text={text} /></div>
  }

  let content: ReactNode

  if (type === 'table') {
    content = (
      <div className="overflow-hidden rounded-cohere-md border border-border">
        <div className="flex gap-4 border-b bg-muted/30 px-4 py-3">
          {Array.from({ length: columns }, (_, i) => <Skeleton key={i} className="h-4 min-w-0 flex-1" />)}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4 border-b px-4 py-4 last:border-0">
            {Array.from({ length: columns }, (_, j) => <Skeleton key={j} className="h-4 min-w-0 flex-1" />)}
          </div>
        ))}
      </div>
    )
  } else if (type === 'cards') {
    content = (
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-3 rounded-cohere-md border border-border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="h-20 w-20 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-20" /></div>
          </div>
        ))}
      </div>
    )
  } else if (type === 'form') {
    content = (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-2/5" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /></div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    )
  } else if (type === 'detail') {
    content = (
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-8 w-2/5" /><Skeleton className="h-4 w-3/5" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: Math.max(2, rows) }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  } else if (type === 'stats') {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: Math.max(1, columns) }, (_, i) => (
          <div key={i} className="space-y-3 rounded-cohere-md border border-border bg-card p-4">
            <Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  } else if (type === 'chart') {
    content = (
      <div className="space-y-4 rounded-cohere-md border border-border bg-card p-5">
        <Skeleton className="h-6 w-1/3" />
        <div className="flex h-56 items-end gap-3 border-b border-l border-border px-3 pb-3">
          {[40, 65, 52, 80, 62, 90, 70].map((bar, i) => <Skeleton key={i} className="flex-1" style={{ height: `${bar}%` }} />)}
        </div>
        <Skeleton className="h-3 w-1/2" />
      </div>
    )
  } else if (type === 'card') {
    content = (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-2/5" />
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={cn('w-full', height)} />)}
      </div>
    )
  } else {
    content = (
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4"><Skeleton className="h-12 w-12 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{text}</span>
      <div aria-hidden="true">{content}</div>
    </div>
  )
}
