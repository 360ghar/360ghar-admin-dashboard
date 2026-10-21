import { render, screen } from '@testing-library/react'
import { BookingCard } from '../BookingCard'
import type { Booking } from '@/types/api'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const booking = {
  id: 1,
  property_id: 2,
  user_id: 3,
  booking_status: 'confirmed',
  payment_status: 'pending',
  check_in_date: '2026-11-01T00:00:00Z',
  check_out_date: '2026-11-03T00:00:00Z',
  guests: 2,
  total_amount: 1000,
} as unknown as Booking

describe('BookingCard record payment', () => {
  it('shows the button only when canRecordPayment is true', () => {
    const { rerender } = render(<BookingCard booking={booking} canRecordPayment />)
    expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument()
    rerender(<BookingCard booking={booking} canRecordPayment={false} />)
    expect(screen.queryByRole('button', { name: /record payment/i })).toBeNull()
    rerender(<BookingCard booking={booking} />)
    expect(screen.queryByRole('button', { name: /record payment/i })).toBeNull()
  })

  it('hides it for a paid booking', () => {
    render(<BookingCard booking={{ ...booking, payment_status: 'paid' }} canRecordPayment />)
    expect(screen.queryByRole('button', { name: /record payment/i })).toBeNull()
  })
})
