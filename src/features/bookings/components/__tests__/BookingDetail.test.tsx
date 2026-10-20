import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BookingDetail from '../BookingDetail'

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  pay: vi.fn(),
  review: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
  viewerId: 99,
  booking: {
    id: 11,
    user_id: 5,
    property_id: 4,
    booking_reference: 'BK-11',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-03',
    nights: 2,
    guests: 2,
    base_amount: 200,
    taxes_amount: 20,
    service_charges: 10,
    discount_amount: 0,
    total_amount: 230,
    booking_status: 'confirmed',
    payment_status: 'pending',
    primary_guest_name: 'Sam',
    primary_guest_phone: '1000000000',
    primary_guest_email: 'sam@example.com',
    early_check_in: false,
    late_check_out: false,
    property: { id: 4, title: 'Sea View', city: 'Goa', country: 'IN', cover_image_url: null },
    guest: { id: 5, display_name: 'Sam', avatar_url: null },
    internal_notes: 'Call before arrival',
    created_at: '2026-09-01T00:00:00Z',
  } as Record<string, unknown>,
}))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/bookings/api/bookingsApi', () => ({
  useGetBookingQuery: () => ({ currentData: mocks.booking, isLoading: false, isFetching: false, error: undefined, refetch: vi.fn() }),
  useCancelBookingMutation: () => [mocks.cancel, { isLoading: false }],
  useProcessPaymentMutation: () => [mocks.pay, { isLoading: false }],
  useAddReviewMutation: () => [mocks.review, { isLoading: false }],
  useUpdateBookingMutation: () => [mocks.update, { isLoading: false }],
}))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ user: { id: mocks.viewerId }, role: 'admin' }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/reactbits/FadeContent', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))

const renderDetail = () => render(<MemoryRouter><BookingDetail id={11} /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.viewerId = 99
  mocks.booking.booking_status = 'confirmed'
  mocks.cancel.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  mocks.pay.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
})

describe('BookingDetail (staff view)', () => {
  it('shows the guest and property summaries and the staff-only internal notes', () => {
    renderDetail()
    expect(screen.getByText('Sea View')).toBeInTheDocument()
    expect(screen.getByText('Sam', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Internal notes' })).toHaveValue('Call before arrival')
  })

  it('saves internal notes through the booking update, null when blank', async () => {
    renderDetail()
    fireEvent.change(screen.getByRole('textbox', { name: 'Internal notes' }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save notes' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ id: 11, data: { internal_notes: null } }))
  })

  it('needs a typed reason to cancel and never invents one', async () => {
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    const confirm = screen.getByRole('button', { name: 'Cancel Booking' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Reason for cancelling'), { target: { value: 'Guest asked' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith({ booking_id: 11, reason: 'Guest asked' }))
  })

  it('records a manual payment only with a method, a transaction id and an amount, and has no defaults', () => {
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Record Payment' }))
    const record = screen.getByRole('button', { name: 'Record payment' })
    // Nothing is preselected: not "upi", not "card", no transaction id.
    expect(screen.getByText('Select how it was paid')).toBeInTheDocument()
    expect(record).toBeDisabled()
    fireEvent.change(screen.getAllByRole('textbox')[screen.getAllByRole('textbox').length - 1], { target: { value: 'rcpt-77' } })
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '230' } })
    // Still disabled: the method is missing.
    expect(record).toBeDisabled()
    expect(mocks.pay).not.toHaveBeenCalled()
  })

  it('offers a review only to the guest of the booking', () => {
    mocks.booking.booking_status = 'completed'
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Add Review' })).not.toBeInTheDocument()
  })

  it('offers the review to the guest', () => {
    mocks.booking.booking_status = 'completed'
    mocks.viewerId = 5
    renderDetail()
    expect(screen.getByRole('button', { name: 'Add Review' })).toBeInTheDocument()
  })
})
