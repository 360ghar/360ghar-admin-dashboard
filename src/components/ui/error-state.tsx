import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'

interface ErrorStateProps {
  title?: string
  /** Explicit message; if omitted, derived from `error` via getErrorMessage. */
  description?: string
  error?: unknown
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactNode
  className?: string
}

/**
 * Consistent error surface for failed queries — complements `<EmptyState>`
 * and `<LoadingState>`. Pass the RTK Query `error` and an `onRetry` (usually
 * the query's `refetch`).
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  error,
  onRetry,
  retryLabel = 'Try again',
  icon,
  className = '',
}: ErrorStateProps) {
  const message =
    description ??
    (error !== undefined
      ? getErrorMessage(error)
      : 'An unexpected error occurred. Please try again.')

  return (
    <Card role="alert" className={`border-destructive/30 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="text-destructive">
          {icon ?? <AlertTriangle className="h-10 w-10" aria-hidden />}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="rounded-cohere-pill">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
