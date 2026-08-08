import { describe, it, expect } from 'vitest'
import {
  buildActivityTrend,
  mergeActivity,
  visitToActivity,
  bookingToActivity,
  propertyToActivity,
  type ActivityEntry,
} from '@/features/core/lib/dashboard'

describe('buildActivityTrend', () => {
  const now = new Date('2026-06-04T12:00:00Z')

  it('produces one bucket per day in the window', () => {
    const trend = buildActivityTrend([], [], { days: 7, now })
    expect(trend).toHaveLength(7)
    trend.forEach((bucket) => {
      expect(bucket.visits).toBe(0)
      expect(bucket.bookings).toBe(0)
    })
  })

  it('tallies visits and bookings into the correct day buckets', () => {
    const visits = [
      { created_at: '2026-06-04T12:00:00Z' },
      { created_at: '2026-06-04T13:00:00Z' },
      { created_at: '2026-06-02T12:00:00Z' },
    ]
    const bookings = [{ created_at: '2026-06-04T12:00:00Z' }]
    const trend = buildActivityTrend(visits, bookings, { days: 7, now })

    const totalVisits = trend.reduce((sum, b) => sum + b.visits, 0)
    const totalBookings = trend.reduce((sum, b) => sum + b.bookings, 0)
    expect(totalVisits).toBe(3)
    expect(totalBookings).toBe(1)

    const today = trend[trend.length - 1]
    expect(today.visits).toBe(2)
    expect(today.bookings).toBe(1)
  })

  it('ignores rows outside the window or without timestamps', () => {
    const visits = [{ created_at: '2020-01-01T00:00:00Z' }, { created_at: null }, {}]
    const trend = buildActivityTrend(visits, [], { days: 7, now })
    expect(trend.reduce((sum, b) => sum + b.visits, 0)).toBe(0)
  })
})

describe('mergeActivity', () => {
  it('sorts newest-first and caps to the limit', () => {
    const entries: ActivityEntry[] = [
      { id: 'a', kind: 'visit', title: 'A', timestamp: '2026-06-01T00:00:00Z', href: '/a' },
      { id: 'b', kind: 'booking', title: 'B', timestamp: '2026-06-03T00:00:00Z', href: '/b' },
      { id: 'c', kind: 'property', title: 'C', timestamp: '2026-06-02T00:00:00Z', href: '/c' },
    ]
    const merged = mergeActivity(entries, 2)
    expect(merged.map((e) => e.id)).toEqual(['b', 'c'])
  })
})

describe('activity mappers', () => {
  it('returns null when there is no created_at', () => {
    expect(visitToActivity({ id: 1 })).toBeNull()
    expect(bookingToActivity({ id: 1 })).toBeNull()
    expect(propertyToActivity({ id: 1, title: 'x' })).toBeNull()
  })

  it('maps a visit with nested property/user', () => {
    const entry = visitToActivity({
      id: 7,
      created_at: '2026-06-04T10:00:00Z',
      status: 'requested',
      property: { title: 'Sea View' },
      user: { full_name: 'Asha' },
    })
    expect(entry).toMatchObject({ id: 'visit-7', kind: 'visit', title: 'Visit · Sea View', subtitle: 'Asha', href: '/visits/7' })
  })

  it('maps a property listing with location subtitle', () => {
    const entry = propertyToActivity({ id: 3, title: 'Loft', created_at: '2026-06-04T10:00:00Z', locality: 'Indiranagar', city: 'Bengaluru' })
    expect(entry).toMatchObject({ id: 'property-3', kind: 'property', title: 'New listing · Loft', subtitle: 'Indiranagar, Bengaluru', href: '/properties/3/view' })
  })
})

import { computeBusinessMetrics, computeStatusBreakdown } from '@/features/core/lib/dashboard'

describe('computeStatusBreakdown', () => {  it('extracts totals from queries with total fields', () => {
    const { totals, isLoading, isError } = computeStatusBreakdown([
      { data: { total: 10, items: [] }, isLoading: false, isError: false },
      { data: { total: 3, items: [] }, isLoading: false, isError: false },
    ])
    expect(totals).toEqual([10, 3])
    expect(isLoading).toBe(false)
    expect(isError).toBe(false)
  })

  it('falls back to items.length when total is missing', () => {
    const { totals } = computeStatusBreakdown([
      { data: { items: [{ id: 1 }, { id: 2 }] }, isLoading: false, isError: false },
    ])
    expect(totals).toEqual([2])
  })

  it('reports loading when any query is loading', () => {
    const { isLoading } = computeStatusBreakdown([
      { data: null, isLoading: true, isError: false },
      { data: null, isLoading: false, isError: false },
    ])
    expect(isLoading).toBe(true)
  })

  it('reports error when any query errored', () => {
    const { isError } = computeStatusBreakdown([
      { data: null, isLoading: false, isError: true },
      { data: null, isLoading: false, isError: false },
    ])
    expect(isError).toBe(true)
  })

  it('returns 0 for a query with null data', () => {
    const { totals } = computeStatusBreakdown([
      { data: null, isLoading: false, isError: false },
    ])
    expect(totals).toEqual([0])
  })
})

describe('computeBusinessMetrics', () => {
  it('computes revenue, averages and conversion from the fetched samples', () => {
    const metrics = computeBusinessMetrics(
      [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      [{ total_amount: 1000 }, { total_amount: 2000 }, { total_amount: null }],
    )
    expect(metrics.visitTotal).toBe(4)
    expect(metrics.bookingTotal).toBe(3)
    expect(metrics.revenue).toBe(3000)
    expect(metrics.avgBookingValue).toBe(1000)
    expect(metrics.visitToBooking).toBe(0.75)
  })

  it('returns zeros when there is no data', () => {
    expect(computeBusinessMetrics(null, undefined)).toEqual({
      revenue: 0,
      visitToBooking: 0,
      avgBookingValue: 0,
      bookingTotal: 0,
      visitTotal: 0,
    })
  })

  it('returns zero conversion when there are visits but no bookings', () => {
    const metrics = computeBusinessMetrics([{ id: 1 }], [])
    expect(metrics.visitToBooking).toBe(0)
    expect(metrics.avgBookingValue).toBe(0)
  })

  it('ignores missing total_amount on bookings', () => {
    const metrics = computeBusinessMetrics([{ id: 1 }], [{}, { total_amount: 500 }])
    expect(metrics.revenue).toBe(500)
    expect(metrics.avgBookingValue).toBe(250)
  })
})
