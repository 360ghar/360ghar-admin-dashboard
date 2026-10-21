import type { BadgeProps } from '@/components/ui/badge'
import type { components } from '@/lib/api/schema.gen'

/**
 * Shared status-to-Badge variant mapper. Used by BookingCard, VisitCard,
 * and any other component that displays entity statuses as badges.
 */

type BookingStatus = components['schemas']['BookingStatus']
type BookingPaymentStatus = components['schemas']['PaymentStatus']
type VisitStatus = components['schemas']['VisitStatus']

// Every map is typed over the generated union: a value the backend adds fails the type check until it is placed here.
const BOOKING_STATUS_COLORS: Record<BookingStatus, BadgeProps['variant']> = {
  pending: 'secondary',
  confirmed: 'default',
  checked_in: 'default',
  checked_out: 'default',
  cancelled: 'destructive',
  completed: 'default',
}

const BOOKING_PAYMENT_STATUS_COLORS: Record<BookingPaymentStatus, BadgeProps['variant']> = {
  pending: 'secondary',
  partial: 'secondary',
  paid: 'default',
  refunded: 'outline',
  failed: 'destructive',
}

const VISIT_STATUS_COLORS: Record<VisitStatus, BadgeProps['variant']> = {
  requested: 'default',
  confirmed: 'default',
  reschedule_suggested: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
}

/** Own-key lookup. An unknown value is `undefined`, never a real status. */
function lookup<T>(map: Record<string, T>, key: string | null | undefined): T | undefined {
  return key != null && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined
}

export function getBookingStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(BOOKING_STATUS_COLORS, status) ?? 'outline'
}

export function getBookingPaymentStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(BOOKING_PAYMENT_STATUS_COLORS, status) ?? 'outline'
}

export function getVisitStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(VISIT_STATUS_COLORS, status) ?? 'outline'
}

const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  reschedule_suggested: 'Reschedule suggested',
}

export function getVisitStatusLabel(status: string): string {
  return lookup(VISIT_STATUS_LABELS, status) ?? status
}

type PropertyStatus = components['schemas']['PropertyStatus']
type ManagedPropertyStatus = components['schemas']['ManagedPropertyStatus']
type Occupancy = 'occupied' | 'vacant'
type BugSeverity = components['schemas']['BugSeverity']
type ListingModerationStatus = components['schemas']['ListingModerationStatus']

const PROPERTY_STATUS_COLORS: Record<PropertyStatus, BadgeProps['variant']> = {
  available: 'default',
  sold: 'secondary',
  rented: 'secondary',
  under_offer: 'outline',
  maintenance: 'destructive',
}

const MANAGED_STATUS_COLORS: Record<ManagedPropertyStatus, BadgeProps['variant']> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline',
}

const OCCUPANCY_COLORS: Record<Occupancy, BadgeProps['variant']> = {
  occupied: 'default',
  vacant: 'outline',
}

const BUG_SEVERITY_COLORS: Record<BugSeverity, BadgeProps['variant']> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
}

const LISTING_MODERATION_STATUS_COLORS: Record<ListingModerationStatus, BadgeProps['variant']> = {
  pending_review: 'secondary',
  live: 'default',
  paused: 'outline',
  rejected: 'destructive',
}

export function getPropertyStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(PROPERTY_STATUS_COLORS, status) ?? 'outline'
}

export function getManagedPropertyStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(MANAGED_STATUS_COLORS, status) ?? 'outline'
}

export function getOccupancyColor(occupied: boolean): BadgeProps['variant'] {
  return OCCUPANCY_COLORS[occupied ? 'occupied' : 'vacant']
}

export function getBugSeverityColor(severity: string | null | undefined): BadgeProps['variant'] {
  return lookup(BUG_SEVERITY_COLORS, severity) ?? 'outline'
}

/** Badge variant for a flatmates listing moderation status (`pending_review`, `live`, `paused`, `rejected`). */
export function getListingModerationStatusColor(status: string | null | undefined): BadgeProps['variant'] {
  return lookup(LISTING_MODERATION_STATUS_COLORS, status) ?? 'outline'
}
