import { IndianRupee, TrendingUp, Target, CalendarCheck } from 'lucide-react'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'
import { ErrorState } from '@/components/ui/error-state'
import { StatCard } from './StatCard'
import type { BusinessMetricsData } from '@/features/core/lib/dashboard'

interface BusinessMetricsProps {
  metrics: BusinessMetricsData
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

/**
 * Business KPIs for the admin dashboard: revenue, average booking value,
 * visit-to-booking conversion, and total bookings.
 *
 * Presentational only — the exact all-time numbers come from the backend
 * `/agents/system/stats` aggregates (see `useDashboardData`).
 */
export function BusinessMetrics({ metrics, isLoading, isError, onRetry }: BusinessMetricsProps) {
  if (isError) {
    return <ErrorState title="Couldn't load business metrics" onRetry={onRetry} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Revenue"
        value={metrics.revenue}
        formatValue={(n) => formatCurrency(n)}
        icon={IndianRupee}
        hint="All-time · excludes cancelled"
        isLoading={isLoading}
      />
      <StatCard
        title="Avg Booking Value"
        value={metrics.avgBookingValue}
        formatValue={(n) => formatCurrency(n)}
        icon={TrendingUp}
        hint="All-time"
        isLoading={isLoading}
      />
      <StatCard
        title="Visit → Booking"
        value={metrics.visitToBooking * 100}
        formatValue={(n) => formatPercent(n)}
        icon={Target}
        hint={`All-time: ${formatNumber(metrics.bookingTotal)} bookings / ${formatNumber(metrics.visitTotal)} visits`}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Bookings"
        value={metrics.bookingTotal}
        formatValue={(n) => formatNumber(n)}
        icon={CalendarCheck}
        hint="All-time"
        isLoading={isLoading}
      />
    </div>
  )
}
