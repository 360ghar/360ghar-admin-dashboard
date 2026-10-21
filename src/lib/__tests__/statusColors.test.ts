import { describe, expect, it } from 'vitest'
import {
  getVisitStatusColor,
  getVisitStatusLabel,
  getPropertyStatusColor,
  getManagedPropertyStatusColor,
  getOccupancyColor,
  getBugSeverityColor,
  getListingModerationStatusColor,
  getBookingStatusColor,
  getBookingPaymentStatusColor,
} from '../statusColors'

describe('visit status wire labels', () => {
  it('maps backend wire values, not python member names', () => {
    expect(getVisitStatusLabel('requested')).toBe('Requested')
    expect(getVisitStatusLabel('reschedule_suggested')).toBe('Reschedule suggested')
    expect(getVisitStatusLabel('confirmed')).toBe('Confirmed')
  })

  it('does not treat scheduled/no_show as known wire labels', () => {
    // Unknown wire values pass through as raw status for display
    expect(getVisitStatusLabel('scheduled')).toBe('scheduled')
    expect(getVisitStatusLabel('no_show')).toBe('no_show')
  })

  it('returns badge variants for wire statuses', () => {
    expect(getVisitStatusColor('requested')).toBe('default')
    expect(getVisitStatusColor('reschedule_suggested')).toBe('secondary')
    expect(getVisitStatusColor('cancelled')).toBe('destructive')
    expect(getVisitStatusColor('scheduled')).toBe('outline')
  })
})

describe('extended status colors', () => {
  it('maps property, PM, bug, and moderation statuses', () => {
    expect(getPropertyStatusColor('available')).toBe('default')
    expect(getManagedPropertyStatusColor('draft')).toBe('secondary')
    expect(getOccupancyColor(true)).toBe('default')
    expect(getOccupancyColor(false)).toBe('outline')
    expect(getBugSeverityColor('critical')).toBe('destructive')
    expect(getListingModerationStatusColor('pending_review')).toBe('secondary')
    expect(getListingModerationStatusColor('paused')).toBe('outline')
    // The old made-up labels are not backend values.
    expect(getListingModerationStatusColor('approved')).toBe('outline')
  })
})

describe('booking colour maps follow the backend vocabulary', () => {
  it('covers checked_in, checked_out and every payment status', () => {
    expect(getBookingStatusColor('checked_in')).toBe('default')
    expect(getBookingStatusColor('checked_out')).toBe('default')
    expect(getBookingStatusColor('refunded')).toBe('outline')
    expect(getBookingPaymentStatusColor('pending')).toBe('secondary')
    expect(getBookingPaymentStatusColor('failed')).toBe('destructive')
    expect(getBookingPaymentStatusColor('unpaid')).toBe('outline')
  })
})
