/**
 * Pure helpers for composing dashboard widgets from existing list endpoints.
 *
 * Kept free of React / RTK so the merge + bucketing logic is unit-testable.
 * The dashboard has no dedicated aggregate endpoint, so these transform the
 * data the platform already exposes (recent visits/bookings/properties) into
 * an activity feed and a short engagement trend.
 */
import { parseServerTimestamp } from '@/lib/dateTime'

export type ActivityKind = 'visit' | 'booking' | 'property'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  title: string
  subtitle?: string
  status?: string
  /** ISO timestamp; entries without a parseable timestamp are dropped. */
  timestamp: string
  href: string
}

/** Property statuses surfaced in the status breakdown, with chart colors (Cohere palette, literal hsl so SVG fills resolve). */
export const PROPERTY_STATUS_META: { value: string; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'hsl(168 100% 22%)' },
  { value: 'rented', label: 'Rented', color: 'hsl(218 77% 48%)' },
  { value: 'sold', label: 'Sold', color: 'hsl(240 5% 25%)' },
  { value: 'under_offer', label: 'Under offer', color: 'hsl(14 100% 64%)' },
  { value: 'maintenance', label: 'Maintenance', color: 'hsl(240 5% 58%)' },
]

export interface TrendBucket {
  key: string
  label: string
  visits: number
  bookings: number
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Bucket recent visits and bookings into the last `days` calendar days.
 * Counts only items whose `created_at` falls inside the window — this is a
 * "recent activity" trend bounded by what the caller fetched, not a full
 * historical series.
 */
export function buildActivityTrend(
  visits: ReadonlyArray<{ created_at?: string | null }>,
  bookings: ReadonlyArray<{ created_at?: string | null }>,
  options?: { days?: number; now?: Date },
): TrendBucket[] {
  const days = options?.days ?? 7
  const today = startOfDay(options?.now ?? new Date())
  const buckets: TrendBucket[] = []
  const indexByKey = new Map<string, number>()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    indexByKey.set(key, buckets.length)
    buckets.push({ key, label: WEEKDAY[d.getDay()], visits: 0, bookings: 0 })
  }

  const tally = (rows: ReadonlyArray<{ created_at?: string | null }>, field: 'visits' | 'bookings') => {
    for (const row of rows) {
      const parsed = parseServerTimestamp(row.created_at)
      if (!parsed) continue
      const idx = indexByKey.get(dayKey(parsed))
      if (idx !== undefined) buckets[idx][field] += 1
    }
  }

  tally(visits, 'visits')
  tally(bookings, 'bookings')
  return buckets
}

export interface StatusQueryLike<T> {
  data?: { total?: number; items?: T[] } | null
  isLoading: boolean
  isError: boolean
}

/**
 * Contract: every status query is issued with `include_total: true` and the
 * backend returns the exact count in `total`. The `items.length` fallback
 * keeps a non-compliant backend from crashing the UI, but the caller should
 * treat a missing `total` as a contract violation (see useDashboardData).
 */
export function computeStatusBreakdown<T>(queries: ReadonlyArray<StatusQueryLike<T>>): {
  totals: number[]
  isLoading: boolean
  isError: boolean
} {
  const totals = queries.map((q) => q.data?.total ?? q.data?.items?.length ?? 0)
  return {
    totals,
    // Surface an error if ANY status query failed — otherwise a single failed
    // query is counted as 0 and silently corrupts the totals/percentages.
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  }
}

/** Sort newest-first by timestamp and cap to `limit`. */
export function mergeActivity(entries: ActivityEntry[], limit = 8): ActivityEntry[] {
  return [...entries]
    .sort((a, b) => {
      const ta = parseServerTimestamp(a.timestamp)?.getTime() ?? 0
      const tb = parseServerTimestamp(b.timestamp)?.getTime() ?? 0
      return tb - ta
    })
    .slice(0, limit)
}

interface VisitRow {
  id: number
  created_at?: string | null
  status?: string
  property?: { title?: string | null } | null
  user?: { full_name?: string | null } | null
}

interface BookingRow {
  id: number
  created_at?: string | null
  booking_status?: string
  primary_guest_name?: string | null
  property?: { title?: string | null } | null
}

interface PropertyRow {
  id: number
  title: string
  created_at?: string | null
  status?: string
  city?: string | null
  locality?: string | null
}

export function visitToActivity(v: VisitRow): ActivityEntry | null {
  if (!v.created_at) return null
  return {
    id: `visit-${v.id}`,
    kind: 'visit',
    title: v.property?.title ? `Visit · ${v.property.title}` : `Visit #${v.id}`,
    subtitle: v.user?.full_name ?? undefined,
    status: v.status,
    timestamp: v.created_at,
    href: `/visits/${v.id}`,
  }
}

export function bookingToActivity(b: BookingRow): ActivityEntry | null {
  if (!b.created_at) return null
  return {
    id: `booking-${b.id}`,
    kind: 'booking',
    title: b.property?.title ? `Booking · ${b.property.title}` : `Booking #${b.id}`,
    subtitle: b.primary_guest_name ?? undefined,
    status: b.booking_status,
    timestamp: b.created_at,
    href: `/bookings/${b.id}`,
  }
}

export function propertyToActivity(p: PropertyRow): ActivityEntry | null {
  if (!p.created_at) return null
  const place = [p.locality, p.city].filter(Boolean).join(', ')
  return {
    id: `property-${p.id}`,
    kind: 'property',
    title: `New listing · ${p.title}`,
    subtitle: place || undefined,
    status: p.status,
    timestamp: p.created_at,
    href: `/properties/${p.id}/view`,
  }
}
