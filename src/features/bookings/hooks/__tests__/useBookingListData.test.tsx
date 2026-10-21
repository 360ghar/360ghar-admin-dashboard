import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBookingListData } from '../useBookingListData'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/features/bookings/api/bookingsApi', () => ({
  useGetAllBookingsQuery: (params: unknown) => {
    mocks.query(params)
    return {}
  },
}))
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ user: { supabase_user_id: 'account-1' } }),
}))

describe('useBookingListData', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.query.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => vi.useRealTimers())

  it('resets the cursor when status, page size, or debounced search changes', () => {
    const { result } = renderHook(() => useBookingListData())
    expect(mocks.query).toHaveBeenLastCalledWith({ cursor: null, limit: 10 })

    act(() => result.current.pager.next('page-2'))
    expect(mocks.query).toHaveBeenLastCalledWith({ cursor: 'page-2', limit: 10 })

    act(() => result.current.setStatus('confirmed'))
    expect(mocks.query).toHaveBeenLastCalledWith({ status: 'confirmed', cursor: null, limit: 10 })

    act(() => result.current.pager.next('page-3'))
    act(() => result.current.setPageSize(20))
    expect(mocks.query).toHaveBeenLastCalledWith({ status: 'confirmed', cursor: null, limit: 20 })

    act(() => result.current.pager.next('page-4'))
    act(() => result.current.setQ('Sam'))
    expect(mocks.query).toHaveBeenLastCalledWith({ status: 'confirmed', cursor: 'page-4', limit: 20 })
    act(() => { vi.advanceTimersByTime(300) })
    expect(mocks.query).toHaveBeenLastCalledWith({ status: 'confirmed', q: 'Sam', cursor: null, limit: 20 })
  })
})
