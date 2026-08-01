import { useHealthCheckQuery } from '@/features/core/api/coreApi'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type HealthState = 'healthy' | 'degraded' | 'unreachable'

/**
 * Small backend-health indicator for the top bar: a dot that reflects the
 * `/health` probe (polled every 60s and on reconnect). Pure observability —
 * never blocks rendering and never surfaces beyond a tooltip.
 */
export function HealthIndicator() {
  const { data, isError, isFetching } = useHealthCheckQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnReconnect: true,
  })

  const state: HealthState = isError
    ? 'unreachable'
    : data?.status === 'degraded'
      ? 'degraded'
      : 'healthy'

  const dotClass =
    state === 'healthy'
      ? 'bg-cohere-deep-green'
      : state === 'degraded'
        ? 'bg-amber-500'
        : 'bg-cohere-coral'

  const label =
    state === 'healthy'
      ? 'Backend healthy'
      : state === 'degraded'
        ? 'Backend degraded — some services may be affected'
        : 'Backend unreachable — data may be stale'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent')}
        >
          <span className={cn('h-2.5 w-2.5 rounded-full', dotClass, isFetching && 'opacity-60')} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

