import { useMemo } from 'react'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { useGetAllVisitsQuery } from '@/features/visits/api/visitsApi'
import { useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import { useUserRole } from '@/hooks/useUserRole'
import {
  PROPERTY_STATUS_META,
  buildActivityTrend,
  bookingToActivity,
  computeBusinessMetrics,
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
  count: number
}

export interface PropertyStatusBreakdown {
  data: PropertyStatusSlice[]
  total: number
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

  const data = PROPERTY_STATUS_META.map((meta, i) => ({ ...meta, count: totals[i] ?? 0 }))
  const total = data.reduce((sum, slice) => sum + slice.count, 0)

  return {
    data,
    total,
    isLoading,
    // Surface an error if ANY status query failed — otherwise a single failed
    // query is counted as 0 and silently corrupts the totals/percentages.
    isError,
    refetch: () => queries.forEach((q) => void q.refetch()),
  }
}

export interface DashboardData {
  trend: TrendBucket[]
  feed: ActivityEntry[]
  metrics: BusinessMetricsData
  statusBreakdown: PropertyStatusBreakdown
  /** Activity semantics: loading while any source loads and the feed is empty. */
  isLoading: boolean
  /** Activity semantics: hard error only when every source failed. */
  isError: boolean
  /** Business-metrics semantics: error when visits OR bookings failed. */
  isMetricsLoading: boolean
  isMetricsError: boolean
  refetch: () => void
}

/**
 * Single source of truth for the dashboard page. Subscribes to each list
 * endpoint exactly once and derives the activity feed, engagement trend AND
 * business metrics from the same cached payloads — so widgets share one
 * network request per endpoint instead of firing per-widget queries with
 * different page sizes.
 *
 * The visits/bookings page size is role-aware: agents have no business-metrics
 * widget, so 50 rows (the pre-consolidation feed size) is enough, while admins
 * fetch 100 to preserve the revenue/conversion sample semantics.
 */
export function useDashboardData(): DashboardData {
  const { role } = useUserRole()
  const listLimit = role === 'agent' ? 50 : 100
  const visits = useGetAllVisitsQuery({ limit: listLimit })
  const bookings = useGetAllBookingsQuery({ limit: listLimit })
  const newProperties = useSearchPropertiesQuery({ sort_by: 'newest', limit: 5 })
  const statusBreakdown = usePropertyStatusBreakdown()

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

  const metrics = useMemo(
    () => computeBusinessMetrics(visits.data?.items, bookings.data?.items),
    [visits.data, bookings.data],
  )

  const queries = [visits, bookings, newProperties]
  // Keep partial successes: only treat as hard error when every source failed
  // (otherwise one flaky endpoint would hide visits/bookings/listings that did load).
  const allFailed = queries.every((q) => q.isError)
  const anyLoading = queries.some((q) => q.isLoading)

  return {
    trend,
    feed,
    metrics,
    statusBreakdown,
    isLoading: anyLoading && feed.length === 0 && !allFailed,
    isError: allFailed,
    // Business metrics need BOTH sources — a single failed query would
    // silently zero out conversion rates if we only showed partial samples.
    isMetricsLoading: visits.isLoading || bookings.isLoading,
    isMetricsError: visits.isError || bookings.isError,
    refetch: () => {
      void visits.refetch()
      void bookings.refetch()
      void newProperties.refetch()
      statusBreakdown.refetch()
    },
  }
}
