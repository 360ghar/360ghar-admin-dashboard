import { fireEvent, render, screen } from '@testing-library/react'
import { CreateBookingDialog } from '../CreateBookingDialog'

const mocks = vi.hoisted(() => ({ isUser: true }))
const idle = { currentData: undefined, error: undefined, isLoading: false, isFetching: false, refetch: vi.fn() }

vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ isUser: mocks.isUser }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/features/bookings/api/bookingsApi', () => ({
  useCreateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCheckAvailabilityQuery: () => idle,
  useCalculatePricingQuery: () => idle,
}))
vi.mock('@/features/users/api/usersApi', () => ({ useGetUsersQuery: () => idle }))
vi.mock('@/features/properties/api/propertiesApi', () => ({
  useGetPropertyQuery: () => idle,
  useSearchPropertiesQuery: () => idle,
}))
vi.mock('../parts/BookingDateSelection', () => ({ default: () => null }))

it('asks staff for a guest but not a guest user', () => {
  mocks.isUser = true
  const { unmount } = render(<CreateBookingDialog />)
  fireEvent.click(screen.getByRole('button', { name: /new booking/i }))
  expect(screen.queryByPlaceholderText(/search guest/i)).toBeNull()
  expect(screen.getByRole('button', { name: /create booking/i })).toBeDisabled()
  unmount()

  mocks.isUser = false
  render(<CreateBookingDialog />)
  fireEvent.click(screen.getByRole('button', { name: /new booking/i }))
  expect(screen.getByPlaceholderText(/search guest/i)).toBeInTheDocument()
})
