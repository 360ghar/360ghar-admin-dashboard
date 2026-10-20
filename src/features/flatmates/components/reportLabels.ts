import type { UserReportReason, UserReportStatus } from '@/types/api'

// Typed over the generated unions: a value the backend adds fails the type check until it is labelled here.
export const reasonLabels: Record<UserReportReason, string> = {
  spam: 'Spam',
  fake_profile: 'Fake Profile',
  abuse: 'Abuse/Harassment',
  inappropriate: 'Inappropriate Content',
  other: 'Other',
}

export const statusLabels: Record<UserReportStatus, string> = {
  open: 'Open',
  reviewed: 'Reviewed',
  dismissed: 'Dismissed',
  actioned: 'Actioned',
}
