import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { usePropertyStatusBreakdown } from '@/features/core/hooks/useDashboardData'
import type { TrendBucket } from '@/features/core/lib/dashboard'
import { formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

const VISIT_COLOR = 'hsl(168 70% 45%)'
const BOOKING_COLOR = 'hsl(218 77% 62%)'
const GRID_COLOR = 'hsl(240 8% 20%)'
const TICK_COLOR = 'hsl(240 8% 62%)'

const TOOLTIP_STYLE = {
  background: 'hsl(240 12% 8% / 0.92)',
  border: '1px solid hsl(240 10% 20%)',
  borderRadius: 12,
  color: 'hsl(240 12% 93%)',
  fontSize: 12,
  boxShadow: '0 8px 32px -8px hsl(0 0% 0% / 0.6)',
} as const

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  )
}

export function PropertyStatusCard({ className }: { className?: string }) {
  const { data, total, isLoading, isError, refetch } = usePropertyStatusBreakdown()
  const slices = data.filter((slice) => slice.count > 0)

  return (
    <Card className={cn('rounded-cohere-md border-cohere-card-border card-glow', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Properties by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load status breakdown" onRetry={() => refetch()} />
        ) : total === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No properties yet"
            description="Property status will appear here once listings exist."
          />
        ) : (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.value} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5">
              {slices.map((slice) => (
                <li key={slice.value} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden />
                    <span className="text-muted-foreground">{slice.label}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(slice.count)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatPercent((slice.count / total) * 100)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ActivityTrendCardProps {
  trend: TrendBucket[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  className?: string
}

export function ActivityTrendCard({ trend, isLoading, isError, onRetry, className }: ActivityTrendCardProps) {
  const hasData = trend.some((bucket) => bucket.visits > 0 || bucket.bookings > 0)

  return (
    <Card className={cn('rounded-cohere-md border-cohere-card-border card-glow', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Activity — last 7 days</CardTitle>
          <Badge variant="outline" className="text-xs">
            Recent
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : isError ? (
          <ErrorState title="Couldn't load activity" onRetry={onRetry} />
        ) : !hasData ? (
          <EmptyState
            icon={<CalendarRange className="h-8 w-8" />}
            title="No recent activity"
            description="Visits and bookings from the last 7 days will appear here."
          />
        ) : (
          <>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: TICK_COLOR }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 12, fill: TICK_COLOR }} />
                  <Tooltip cursor={{ fill: 'hsl(240 10% 14% / 0.5)' }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="visits" name="Visits" fill={VISIT_COLOR} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bookings" name="Bookings" fill={BOOKING_COLOR} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <LegendDot color={VISIT_COLOR} label="Visits" />
              <LegendDot color={BOOKING_COLOR} label="Bookings" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
