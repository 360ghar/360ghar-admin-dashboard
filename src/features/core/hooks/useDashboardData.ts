import { useMemo } from 'react'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { useGetAllVisitsQuery } from '@/features/visits/api/visitsApi'
import { useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import {
  PROPERTY_STATUS_META,
  buildActivityTrend,
  bookingToActivity,
  mergeActivity,
  propertyToActivity,
  visitToActivity,
  type ActivityEntry,
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
  const totals = [
    available.data?.total ?? available.data?.items?.length,
    rented.data?.total ?? rented.data?.items?.length,
    sold.data?.total ?? sold.data?.items?.length,
    underOffer.data?.total ?? underOffer.data?.items?.length,
    maintenance.data?.total ?? maintenance.data?.items?.length,
  ]

  const data = PROPERTY_STATUS_META.map((meta, i) => ({ ...meta, count: totals[i] ?? 0 }))
  const total = data.reduce((sum, slice) => sum + slice.count, 0)

  return {
    data,
    total,
    isLoading: queries.some((q) => q.isLoading),
    // Surface an error if ANY status query failed — otherwise a single failed
    // query is counted as 0 and silently corrupts the totals/percentages.
    isError: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => void q.refetch()),
  }
}

export interface DashboardActivity {
  trend: TrendBucket[]
  feed: ActivityEntry[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

/**
 * Recent activity feed + a short engagement trend, composed from the most
 * recent visits, bookings and new listings (all server-side scoped to the
 * caller's role).
 */
export function useDashboardActivity(): DashboardActivity {
  const visits = useGetAllVisitsQuery({ limit: 50 })
  const bookings = useGetAllBookingsQuery({ limit: 50 })
  const newProperties = useSearchPropertiesQuery({ sort_by: 'newest', limit: 5 })

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

  const queries = [visits, bookings, newProperties]
  // Keep partial successes: only treat as hard error when every source failed
  // (otherwise one flaky endpoint would hide visits/bookings/listings that did load).
  const allFailed = queries.every((q) => q.isError)
  const anyLoading = queries.some((q) => q.isLoading)

  return {
    trend,
    feed,
    isLoading: anyLoading && feed.length === 0 && !allFailed,
    isError: allFailed,
    error: visits.error || bookings.error || newProperties.error,
    refetch: () => {
      void visits.refetch()
      void bookings.refetch()
      void newProperties.refetch()
    },
  }
}
