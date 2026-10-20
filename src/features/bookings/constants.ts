import type { BookingStatus, PaymentStatus } from '@/types/api'

/** Wire values, typed over the generated unions. `unpaid` and `refunded` are not booking statuses; `unpaid` is not a payment status. */
const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  partial: 'Partial',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Failed',
}

export const BOOKING_STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]

export const bookingStatusLabel = (status: BookingStatus) => BOOKING_STATUS_LABELS[status]
export const paymentStatusLabel = (status: PaymentStatus) => PAYMENT_STATUS_LABELS[status]

export function isBookingStatus(value: string): value is BookingStatus {
  return Object.prototype.hasOwnProperty.call(BOOKING_STATUS_LABELS, value)
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.prototype.hasOwnProperty.call(PAYMENT_STATUS_LABELS, value)
}

/** How a manual payment was received. The admin picks one: there is no default. */
export const MANUAL_PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card (recorded offline)' },
] as const
