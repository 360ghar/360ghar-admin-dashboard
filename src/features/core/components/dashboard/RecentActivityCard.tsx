import type { ComponentType, ReactNode } from 'react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Building2, Calendar } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import type { ActivityEntry, ActivityKind } from '@/features/core/lib/dashboard'
import { formatRelativeTime } from '@/lib/format'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const KIND_ICON: Record<ActivityKind, ComponentType<{ className?: string }>> = {
  visit: Calendar,
  booking: BookOpen,
  property: Building2,
}

interface RecentActivityCardProps {
  feed: ActivityEntry[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * Activity feed with the ReactBits AnimatedList entrance treatment:
 * items scale/fade in as they scroll into view.
 */
function AnimatedActivityItem({ children, index }: { children: ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5, once: true })
  const prefersReducedMotion = usePrefersReducedMotion()

  if (prefersReducedMotion) {
    return <div ref={ref}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.9, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.9, opacity: 0, y: 8 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.06, 0.5) }}
    >
      {children}
    </motion.div>
  )
}

export function RecentActivityCard({ feed, isLoading, isError, onRetry }: RecentActivityCardProps) {
  return (
    <Card className="rounded-cohere-md border-cohere-card-border card-glow">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load activity" onRetry={onRetry} />
        ) : feed.length === 0 ? (
          <EmptyState title="No recent activity" description="New visits, bookings and listings will show up here." />
        ) : (
          <ul className="divide-y divide-cohere-hairline">
            {feed.map((entry, index) => {
              const Icon = KIND_ICON[entry.kind]
              return (
                <AnimatedActivityItem key={entry.id} index={index}>
                  <li>
                    <Link
                      to={entry.href}
                      className="flex items-center gap-3 rounded-cohere-sm px-2 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary/80">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{entry.title}</span>
                        {entry.subtitle && (
                          <span className="block truncate text-xs text-muted-foreground">{entry.subtitle}</span>
                        )}
                      </span>
                      {entry.status && (
                        <Badge variant="outline" className="hidden shrink-0 capitalize sm:inline-flex">
                          {entry.status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </Link>
                  </li>
                </AnimatedActivityItem>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
