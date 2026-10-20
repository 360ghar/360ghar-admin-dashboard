import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BookingManagementPage from '../BookingManagementPage'

const mocks = vi.hoisted(() => ({ getAllBookings: vi.fn() }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ user: { id: 1, supabase_user_id: 'admin-1', role: 'admin' }, role: 'admin', isUser: false }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/features/bookings/api/bookingsApi', () => ({
  useGetUserBookingsQuery: () => ({ currentData: undefined, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetAllBookingsQuery: mocks.getAllBookings,
  useCancelBookingMutation: () => [vi.fn()],
  useAddReviewMutation: () => [vi.fn()],
}))
vi.mock('@/features/bookings/components/BookingCard', () => ({ BookingCard: ({ booking }: { booking: { id: number } }) => <p>Booking {booking.id}</p> }))
vi.mock('@/features/bookings/components/CreateBookingDialog', () => ({ CreateBookingDialog: () => null }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/FadeContent', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

// One stable result: a new object on every render would only re-render the page.
const firstPage = {
  currentData: { items: [{ id: 1 }, { id: 2 }], has_more: true, next_cursor: 'cursor-2', limit: 20, total: null },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
}

beforeEach(() => {
  mocks.getAllBookings.mockReset()
  mocks.getAllBookings.mockReturnValue(firstPage)
})

it('follows next_cursor so bookings after the first 20 can be reached', () => {
  render(<MemoryRouter><BookingManagementPage embedded /></MemoryRouter>)
  expect(mocks.getAllBookings).toHaveBeenLastCalledWith({ status: undefined, q: undefined, cursor: null }, { skip: false })

  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

  expect(mocks.getAllBookings).toHaveBeenLastCalledWith({ status: undefined, q: undefined, cursor: 'cursor-2' }, { skip: false })
})
