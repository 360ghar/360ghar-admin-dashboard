import type { BadgeProps } from '@/components/ui/badge'

/**
 * Shared status-to-Badge variant mapper. Used by BookingCard, VisitCard,
 * and any other component that displays entity statuses as badges.
 */

type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'refunded'
type BookingPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded'
type VisitStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'reschedule_suggested'

const BOOKING_STATUS_COLORS: Record<BookingStatus, BadgeProps['variant']> = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
  completed: 'default',
  refunded: 'outline',
}

const BOOKING_PAYMENT_STATUS_COLORS: Record<BookingPaymentStatus, BadgeProps['variant']> = {
  paid: 'default',
  partial: 'secondary',
  unpaid: 'destructive',
  refunded: 'outline',
}

const VISIT_STATUS_COLORS: Record<VisitStatus, BadgeProps['variant']> = {
  requested: 'default',
  confirmed: 'default',
  reschedule_suggested: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
}

export function getBookingStatusColor(status: string): BadgeProps['variant'] {
  return BOOKING_STATUS_COLORS[status as BookingStatus] ?? 'outline'
}

export function getBookingPaymentStatusColor(status: string): BadgeProps['variant'] {
  return BOOKING_PAYMENT_STATUS_COLORS[status as BookingPaymentStatus] ?? 'outline'
}

export function getVisitStatusColor(status: string): BadgeProps['variant'] {
  return VISIT_STATUS_COLORS[status as VisitStatus] ?? 'outline'
}

const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  reschedule_suggested: 'Reschedule suggested',
}

export function getVisitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status as VisitStatus] ?? status
}

type PropertyStatus = 'available' | 'sold' | 'rented' | 'under_offer' | 'maintenance'
type ManagedPropertyStatus = 'active' | 'draft' | 'archived'
type Occupancy = 'occupied' | 'vacant'
type BugSeverity = 'low' | 'medium' | 'high' | 'critical'
type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged'

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

const MODERATION_STATUS_COLORS: Record<ModerationStatus, BadgeProps['variant']> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  flagged: 'destructive',
}

export function getPropertyStatusColor(status: string): BadgeProps['variant'] {
  return PROPERTY_STATUS_COLORS[status as PropertyStatus] ?? 'outline'
}

export function getManagedPropertyStatusColor(status: string): BadgeProps['variant'] {
  return MANAGED_STATUS_COLORS[status as ManagedPropertyStatus] ?? 'outline'
}

export function getOccupancyColor(occupied: boolean): BadgeProps['variant'] {
  return OCCUPANCY_COLORS[occupied ? 'occupied' : 'vacant']
}

export function getBugSeverityColor(severity: string): BadgeProps['variant'] {
  return BUG_SEVERITY_COLORS[severity as BugSeverity] ?? 'outline'
}

export function getModerationStatusColor(status: string): BadgeProps['variant'] {
  return MODERATION_STATUS_COLORS[status as ModerationStatus] ?? 'outline'
}
