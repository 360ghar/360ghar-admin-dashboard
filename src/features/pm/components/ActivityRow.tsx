import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/types/pm'

interface ActivityRowProps {
  activity: ActivityItem
  /** Pre-formatted timestamp — callers choose relative vs. absolute. */
  timestamp: ReactNode
  /** Extra fields appended after status/amount (e.g. property/lease refs in the audit log). */
  extra?: ReactNode
  className?: string
}

/** One activity line (type • status • amount [+ extra] — timestamp), shared across the PM activity feeds. */
export function ActivityRow({ activity, timestamp, extra, className }: ActivityRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <div className="min-w-0">
        <span className="font-medium">{activity.type}</span>
        {activity.status ? <span className="text-muted-foreground"> • {activity.status}</span> : null}
        {activity.amount ? <span className="text-muted-foreground"> • {formatCurrency(activity.amount)}</span> : null}
        {extra}
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">{timestamp}</div>
    </div>
  )
}
