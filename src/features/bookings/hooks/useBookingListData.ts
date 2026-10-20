import { useMemo } from 'react'
import { useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import type { BookingsQuery } from '@/features/bookings/api/bookingsApi'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useScopedDebounce } from '@/hooks/useScopedDebounce'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { PAGE_SIZE_OPTIONS, usePageSizePreference } from '@/hooks/usePageSizePreference'
import { useUserRole } from '@/hooks/useUserRole'
import { BOOKING_STATUSES, PAYMENT_STATUSES, isBookingStatus, isPaymentStatus } from '@/features/bookings/constants'

const defaultFilters = { status: '', paymentStatus: '', q: '' }
// Filter values are the backend wire values. There is no `unpaid` payment status.
const allowedFilterValues = {
  status: ['', ...BOOKING_STATUSES],
  paymentStatus: ['', ...PAYMENT_STATUSES],
}

export function useBookingListData() {
  const { user } = useUserRole()
  const accountId = user?.supabase_user_id
  const { filters, setFilters, clearFilters } = useFilterPersistence({
    key: 'bookings',
    accountId,
    defaultValue: defaultFilters,
    allowedValues: allowedFilterValues,
  })
  const { status, paymentStatus, q } = filters
  const debouncedQuery = useScopedDebounce(q, accountId)
  const [pageSize, setPageSize] = usePageSizePreference({
    key: 'bookings',
    accountId,
    defaultSize: 10,
    sizes: PAGE_SIZE_OPTIONS,
  })
  const pager = useCursorPagination(JSON.stringify([accountId, status, paymentStatus, debouncedQuery, pageSize]))

  const params = useMemo<BookingsQuery>(() => ({
    ...(isBookingStatus(status) ? { status } : {}),
    ...(isPaymentStatus(paymentStatus) ? { payment_status: paymentStatus } : {}),
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
    cursor: pager.cursor,
    limit: pageSize,
  }), [status, paymentStatus, debouncedQuery, pager.cursor, pageSize])

  const query = useGetAllBookingsQuery(params)
  const activeFilterCount = Number(Boolean(status)) + Number(Boolean(paymentStatus)) + Number(Boolean(q))

  return {
    accountId,
    filters,
    setStatus: (value: string) => setFilters({ status: value }),
    setPaymentStatus: (value: string) => setFilters({ paymentStatus: value }),
    setQ: (value: string) => setFilters({ q: value }),
    clearFilters,
    pageSize,
    setPageSize,
    pager,
    query,
    activeFilterCount,
  }
}
