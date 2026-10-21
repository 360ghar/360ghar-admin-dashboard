import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingStaff } from '@/types/api'
import BookingList from '../BookingList'
import { bookingColumns } from '../BookingListPresentation'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  cancel: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/bookings/hooks/useBookingListData', () => ({
  useBookingListData: () => {
    const query: unknown = mocks.query()
    return {
      filters: { status: '', paymentStatus: '', q: '' },
      setStatus: vi.fn(),
      setPaymentStatus: vi.fn(),
      setQ: vi.fn(),
      clearFilters: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      pager: { cursor: null, canPrev: false, next: vi.fn(), prev: vi.fn() },
      query,
      activeFilterCount: 0,
    }
  },
}))
vi.mock('@/features/bookings/api/bookingsApi', () => ({
  useCancelBookingMutation: () => [mocks.cancel],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }))
vi.mock('@/components/ui/responsive-data-table', () => ({
  ResponsiveDataTable: ({ data, rowSelection, onRowSelectionChange }: {
    data: BookingStaff[]
    rowSelection: Record<string, boolean>
    onRowSelectionChange: (selection: Record<string, boolean>) => void
  }) => (
    <div>{data.map((booking) => (
      <button
        key={booking.id}
        aria-pressed={Boolean(rowSelection[String(booking.id)])}
        onClick={() => onRowSelectionChange({ ...rowSelection, [String(booking.id)]: true })}
      >
        Select {booking.booking_reference}
      </button>
    ))}</div>
  ),
}))

const oldBooking: BookingStaff = {
  id: 1,
  property_id: 4,
  user_id: 5,
  booking_reference: 'old-booking',
  check_in_date: '2026-10-01',
  check_out_date: '2026-10-02',
  guests: 1,
  primary_guest_name: 'Sam',
  primary_guest_phone: '1000000000',
  primary_guest_email: 'sam@example.com',
  nights: 1,
  base_amount: 100,
  taxes_amount: 0,
  service_charges: 0,
  discount_amount: 0,
  total_amount: 100,
  early_check_in: false,
  late_check_out: false,
  booking_status: 'confirmed',
  payment_status: 'paid',
  created_at: '2026-09-01T00:00:00Z',
}
const newBooking: BookingStaff = { ...oldBooking, id: 2, booking_reference: 'new-booking' }
const oldPage = { items: [oldBooking], has_more: false, next_cursor: null, limit: 10 }
const newPage = { items: [newBooking], has_more: false, next_cursor: null, limit: 10 }

describe('BookingList query transitions', () => {
  it('sorts the Amount column by the displayed total amount', () => {
    expect(bookingColumns.find((column) => column.id === 'amount')).toMatchObject({
      accessorKey: 'total_amount',
    })
  })

  it('excludes object-valued Property and Guest columns from sort options', () => {
    expect(bookingColumns.find((column) => 'accessorKey' in column && column.accessorKey === 'property')).toMatchObject({ enableSorting: false })
    expect(bookingColumns.find((column) => column.id === 'guest')).toMatchObject({ enableSorting: false })
  })

  beforeEach(() => {
    mocks.query.mockReset()
    mocks.cancel.mockReset()
    mocks.toast.mockReset()
  })

  it('hides the previous page and its selected actions while the new query loads', () => {
    mocks.query.mockReturnValue({ data: oldPage, currentData: oldPage, isLoading: false, isFetching: false, error: undefined, refetch: vi.fn() })
    const view = render(<MemoryRouter><BookingList /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Select old-booking' }))
    expect(screen.getByRole('button', { name: 'Cancel Selected' })).toBeInTheDocument()

    mocks.query.mockReturnValue({ data: oldPage, currentData: undefined, isLoading: false, isFetching: true, error: undefined, refetch: vi.fn() })
    view.rerender(<MemoryRouter><BookingList /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Select old-booking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Selected' })).not.toBeInTheDocument()

    mocks.query.mockReturnValue({ data: newPage, currentData: newPage, isLoading: false, isFetching: false, error: undefined, refetch: vi.fn() })
    view.rerender(<MemoryRouter><BookingList /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Select new-booking' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Selected' })).not.toBeInTheDocument()
  })

  it('keeps only failed bookings selected and retries only those bookings', async () => {
    const page = { items: [oldBooking, newBooking], has_more: false, next_cursor: null, limit: 10 }
    mocks.query.mockReturnValue({ data: page, currentData: page, isLoading: false, isFetching: false, error: undefined, refetch: vi.fn() })
    let failedOnce = false
    mocks.cancel.mockImplementation(({ booking_id: bookingId }: { booking_id: number }) => ({
      unwrap: () => {
        if (bookingId === 2 && !failedOnce) {
          failedOnce = true
          return Promise.reject(new Error('Server failed'))
        }
        return Promise.resolve()
      },
    }))
    render(<MemoryRouter><BookingList /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Select old-booking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select new-booking' }))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Selected' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel bookings' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Retry the selected booking'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByText('Select old-booking')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Select new-booking')).toHaveAttribute('aria-pressed', 'true')
    expect(mocks.cancel).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel bookings' }))
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(3))
    expect(mocks.cancel).toHaveBeenNthCalledWith(1, { booking_id: 1, reason: 'Cancelled by staff' })
    expect(mocks.cancel).toHaveBeenNthCalledWith(2, { booking_id: 2, reason: 'Cancelled by staff' })
    expect(mocks.cancel).toHaveBeenNthCalledWith(3, { booking_id: 2, reason: 'Cancelled by staff' })
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
