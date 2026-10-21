import { useMemo } from 'react'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { useGetAllVisitsQuery } from '@/features/visits/api/visitsApi'
import { useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import { useGetSystemStatsQuery } from '@/features/core/api/systemApi'
import { useUserRole } from '@/hooks/useUserRole'
import {
  PROPERTY_STATUS_META,
  buildActivityTrend,
  bookingToActivity,
  computeStatusBreakdown,
  mergeActivity,
  propertyToActivity,
  visitToActivity,
  type ActivityEntry,
  type BusinessMetricsData,
  type TrendBucket,
} from '@/features/core/lib/dashboard'

export interface PropertyStatusSlice {
  value: string
  label: string
  color: string
  count: number | null
}

export interface PropertyStatusBreakdown {
  data: PropertyStatusSlice[]
  total: number | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Property counts per status. We pass `include_total: true` so the backend
 * returns the exact count per status rather than relying on the page size.
 * Hooks are called statically (one per status) to satisfy the rules of hooks.
 */
export function usePropertyStatusBreakdown(): PropertyStatusBreakdown {
  const available = useSearchPropertiesQuery({ status: 'available', limit: 1, include_total: true })
  const rented = useSearchPropertiesQuery({ status: 'rented', limit: 1, include_total: true })
  const sold = useSearchPropertiesQuery({ status: 'sold', limit: 1, include_total: true })
  const underOffer = useSearchPropertiesQuery({ status: 'under_offer', limit: 1, include_total: true })
  const maintenance = useSearchPropertiesQuery({ status: 'maintenance', limit: 1, include_total: true })

  const queries = [available, rented, sold, underOffer, maintenance]
  const { totals, isLoading, isError } = computeStatusBreakdown(queries)

  const data = PROPERTY_STATUS_META.map((meta, i) => ({ ...meta, count: totals[i] }))
  const total = data.every((slice) => slice.count !== null)
    ? data.reduce((sum, slice) => sum + (slice.count ?? 0), 0)
    : null

  return {
    data,
    total,
    isLoading,
    // Surface an error if ANY status query failed — otherwise a single failed
    // query is counted as 0 and silently corrupts the totals/percentages.
    isError,
    refetch: () => queries.filter((q, index) => q.isError || totals[index] === null).forEach((q) => void q.refetch()),
  }
}

export interface DashboardData {
  trend: TrendBucket[]
  feed: ActivityEntry[]
  metrics: BusinessMetricsData
  statusBreakdown: PropertyStatusBreakdown
  /** Activity semantics: loading while any source loads and the feed is empty. */
  isLoading: boolean
  isPartialError: boolean
  isTrendLoading: boolean
  isTrendError: boolean
  isTrendPartialError: boolean
  /** Activity semantics: hard error only when no usable entries exist. */
  isError: boolean
  /** Business-metrics semantics: loading/error from the admin aggregates query. */
  isMetricsLoading: boolean
  isMetricsError: boolean
  refetchActivity: () => void
  refetchTrend: () => void
  refetchMetrics: () => void
}

/**
 * Single source of truth for the dashboard page. Subscribes to each list
 * endpoint exactly once and derives the activity feed and engagement trend
 * from the same cached payloads — so widgets share one network request per
 * endpoint instead of firing per-widget queries with different page sizes.
 *
 * Exact business aggregates (revenue, booking/visit totals, conversion) come
 * from the backend `/agents/system/stats` endpoint (admin-only), not from
 * list-page samples.
 */
export function useDashboardData(): DashboardData {
  const { role } = useUserRole()
  // The recent-activity feed/trend only need a bounded window of rows.
  const listLimit = role === 'agent' ? 50 : 100
  const visits = useGetAllVisitsQuery({ limit: listLimit })
  const bookings = useGetAllBookingsQuery({ limit: listLimit })
  const newProperties = useSearchPropertiesQuery({ sort_by: 'newest', limit: 5 })
  const statusBreakdown = usePropertyStatusBreakdown()
  const systemStats = useGetSystemStatsQuery(undefined, { skip: role !== 'admin' })

  const trend = useMemo(
    () => buildActivityTrend(visits.data?.items ?? [], bookings.data?.items ?? []),
    [visits.data, bookings.data],
  )

  const feed = useMemo(() => {
    const entries: ActivityEntry[] = []
    for (const v of visits.data?.items ?? []) {
      const entry = visitToActivity(v)
      if (entry) entries.push(entry)
    }
    for (const b of bookings.data?.items ?? []) {
      const entry = bookingToActivity(b)
      if (entry) entries.push(entry)
    }
    for (const p of newProperties.data?.items ?? []) {
      const entry = propertyToActivity(p)
      if (entry) entries.push(entry)
    }
    return mergeActivity(entries, 8)
  }, [visits.data, bookings.data, newProperties.data])

  // Exact all-time business metrics from the backend aggregates.
  const metrics = useMemo<BusinessMetricsData>(() => {
    const revenue = systemStats.data?.total_revenue ?? 0
    const bookingTotal = systemStats.data?.total_bookings ?? 0
    const visitTotal = systemStats.data?.total_visits ?? 0
    return {
      revenue,
      bookingTotal,
      visitTotal,
      visitToBooking: visitTotal > 0 ? bookingTotal / visitTotal : 0,
      avgBookingValue: bookingTotal > 0 ? revenue / bookingTotal : 0,
    }
  }, [systemStats.data])

  const activityQueries = [visits, bookings, newProperties]
  const trendQueries = [visits, bookings]
  const activityFailed = activityQueries.some((q) => q.isError)
  const trendFailed = trendQueries.some((q) => q.isError)
  const activityLoading = activityQueries.some((q) => q.isLoading)
  const trendLoading = trendQueries.some((q) => q.isLoading)

  return {
    trend,
    feed,
    metrics,
    statusBreakdown,
    isLoading: activityLoading && feed.length === 0,
    isError: activityFailed && feed.length === 0 && !activityLoading,
    isPartialError: activityFailed && feed.length > 0,
    isTrendLoading: trendLoading,
    // A refetch that fails while earlier data is cached is a partial error, not a blank chart.
    isTrendError: trendQueries.every((q) => q.isError) && !visits.data && !bookings.data,
    isTrendPartialError: trendFailed && !(trendQueries.every((q) => q.isError) && !visits.data && !bookings.data),
    // Business metrics need the admin aggregates — a failed stats query would
    // silently zero out conversion rates if we only showed partial samples.
    isMetricsLoading: role === 'admin' && systemStats.isLoading,
    isMetricsError: role === 'admin' && systemStats.isError,
    refetchActivity: () => activityQueries.filter((q) => q.isError).forEach((q) => void q.refetch()),
    refetchTrend: () => trendQueries.filter((q) => q.isError).forEach((q) => void q.refetch()),
    refetchMetrics: () => { if (role === 'admin' && systemStats.isError) void systemStats.refetch() },
  }
}
