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
 * Business KPIs for the admin dashboard: monthly revenue, booking conversion,
 * visit-to-booking conversion, and average booking value.
 *
 * Presentational only — the data comes from the shared dashboard queries
 * (see `useDashboardData`) so the page subscribes to `/visits/all` and
 * `/bookings/all` exactly once instead of once per widget.
 */
export function BusinessMetrics({ metrics, isLoading, isError, onRetry }: BusinessMetricsProps) {
  if (isError) {
    return <ErrorState title="Couldn't load business metrics" onRetry={onRetry} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Revenue (recent bookings)"
        value={metrics.revenue}
        formatValue={(n) => formatCurrency(n)}
        icon={IndianRupee}
        hint={`Across ${formatNumber(metrics.bookingTotal)} recent bookings`}
        isLoading={isLoading}
      />
      <StatCard
        title="Avg Booking Value"
        value={metrics.avgBookingValue}
        formatValue={(n) => formatCurrency(n)}
        icon={TrendingUp}
        isLoading={isLoading}
      />
      <StatCard
        title="Visit → Booking"
        value={metrics.visitToBooking * 100}
        formatValue={(n) => formatPercent(n)}
        icon={Target}
        hint={`Recent sample: ${formatNumber(metrics.bookingTotal)} bookings / ${formatNumber(metrics.visitTotal)} visits`}
        isLoading={isLoading}
      />
      <StatCard
        title="Recent Bookings"
        value={metrics.bookingTotal}
        formatValue={(n) => formatNumber(n)}
        icon={CalendarCheck}
        isLoading={isLoading}
      />
    </div>
  )
}
