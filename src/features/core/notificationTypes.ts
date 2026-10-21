import type { components } from '@/lib/api/schema.gen'

type S = components['schemas']

/** Every key the typed send accepts (`TypedUserNotification.type_key`). Generated, so a new backend key fails the type check here. */
export type NotificationTypeKey = S['TypedUserNotification']['type_key']

/** The marketing subset (`MarketingNotification.type_key`). */
export type MarketingTypeKey = S['MarketingNotification']['type_key']

/** Labels for the admin "send notification to one user" form. Typed over the full union: a missing or extra key is a compile error. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeKey, string> = {
  booking_confirmed: 'Booking confirmed',
  payment_failed: 'Payment failed',
  document_approved: 'Document approved',
  chat_message: 'Chat message',
  password_changed: 'Password changed',
  security_alert: 'Security alert',
  app_update: 'App update',
  policy_update: 'Policy update',
  promotion_generic: 'Promotion',
  discount_offer: 'Discount offer',
  win_back: 'Win-back',
  upsell_suggestion: 'Upsell suggestion',
  onboarding_nudge: 'Onboarding nudge',
  visit_reminder: 'Visit reminder',
  property_recommendation: 'Property recommendation',
  daily_digest: 'Daily digest',
  flatmate_new_message: 'Flatmates: new message',
  flatmate_new_match: 'Flatmates: new match',
  flatmate_listing_approved: 'Flatmates: listing approved',
  flatmate_listing_rejected: 'Flatmates: listing rejected',
  flatmate_account_suspended: 'Flatmates: account suspended',
  flatmate_account_warned: 'Flatmates: account warned',
  flatmate_report_actioned: 'Flatmates: report actioned',
  flatmate_report_dismissed: 'Flatmates: report dismissed',
  flatmate_visit_scheduled: 'Flatmates: visit scheduled',
  flatmate_visit_confirmed: 'Flatmates: visit confirmed',
  admin_broadcast: 'Admin broadcast',
}

export const NOTIFICATION_TYPE_KEYS = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationTypeKey[]

/** Labels for the marketing composer. Typed over the marketing union. */
export const MARKETING_TYPE_LABELS: Record<MarketingTypeKey, string> = {
  promotion_generic: 'Promotion (generic)',
  discount_offer: 'Discount offer',
  win_back: 'Win-back',
  upsell_suggestion: 'Upsell suggestion',
  onboarding_nudge: 'Onboarding nudge',
  property_recommendation: 'Property recommendation',
  daily_digest: 'Daily digest',
}

export const MARKETING_TYPE_KEYS = Object.keys(MARKETING_TYPE_LABELS) as MarketingTypeKey[]

export function isNotificationTypeKey(value: string): value is NotificationTypeKey {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPE_LABELS, value)
}

export function isMarketingTypeKey(value: string): value is MarketingTypeKey {
  return Object.prototype.hasOwnProperty.call(MARKETING_TYPE_LABELS, value)
}
