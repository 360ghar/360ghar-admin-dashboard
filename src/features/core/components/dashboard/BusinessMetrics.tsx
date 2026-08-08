import { useMemo } from 'react'
import { IndianRupee, TrendingUp, Target, Percent } from 'lucide-react'
import { useGetAllVisitsQuery } from '@/features/visits/api/visitsApi'
import { useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'
import { ErrorState } from '@/components/ui/error-state'
import { StatCard } from './StatCard'

/**
 * Business KPIs for the admin dashboard: monthly revenue, booking conversion,
 * visit-to-booking conversion, and average booking value. Composed from the
 * existing list endpoints (no dedicated aggregate endpoint exists).
 */
export function BusinessMetrics() {
  const visits = useGetAllVisitsQuery({ limit: 100 })
  const bookings = useGetAllBookingsQuery({ limit: 100 })

  const isLoading = visits.isLoading || bookings.isLoading
  // Both sources feed conversion metrics — any failure would silently zero out
  // rates if we only showed empty samples.
  const isError = visits.isError || bookings.isError

  const metrics = useMemo(() => {
    const bookingList = bookings.data?.items ?? []
    const visitTotal = visits.data?.items?.length ?? 0
    const bookingTotal = bookingList.length

    // Revenue: sum of total_amount across fetched bookings (best-effort sample).
    const revenue = bookingList.reduce((sum, b) => sum + (b.total_amount ?? 0), 0)

    // Conversion rates use the sampled array lengths (no `total` field is
    // returned by the cursor-paginated list endpoints).
    const visitToBooking = visitTotal > 0 ? (bookingTotal / visitTotal) : 0

    // Average booking value from the sampled bookings.
    const avgBookingValue = bookingList.length ? revenue / bookingList.length : 0

    return { revenue, visitToBooking, avgBookingValue, bookingTotal, visitTotal }
  }, [visits.data, bookings.data])

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load business metrics"
        onRetry={() => {
          void visits.refetch()
          void bookings.refetch()
        }}
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Booking Revenue (sample)"
        value={metrics.revenue}
        formatValue={(n) => formatCurrency(n)}
        icon={IndianRupee}
        hint={`Across ${formatNumber(metrics.bookingTotal)} bookings`}
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
        hint={`${formatNumber(metrics.bookingTotal)} bookings / ${formatNumber(metrics.visitTotal)} visits`}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Bookings"
        value={metrics.bookingTotal}
        formatValue={(n) => formatNumber(n)}
        icon={Percent}
        isLoading={isLoading}
      />
    </div>
  )
}
