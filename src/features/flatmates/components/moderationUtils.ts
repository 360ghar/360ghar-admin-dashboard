import type { User } from '@/types/api'
import type { FlatmatesListing, FlatmatesReport } from '../types'

export type PrescreenFlag = NonNullable<FlatmatesListing['ai_prescreen_flags']>[number]

export const getPrescreenFlags = (listing: FlatmatesListing): PrescreenFlag[] => {
  if (Array.isArray(listing.ai_prescreen_flags)) return listing.ai_prescreen_flags
  const rawFlags = listing.listing_preferences?.ai_prescreen_flags
  return Array.isArray(rawFlags) ? (rawFlags as PrescreenFlag[]) : []
}

export const getPrescreenReason = (listing: FlatmatesListing): string | null => {
  const reason = listing.ai_flag_reason ?? listing.listing_preferences?.ai_prescreen_reason
  return typeof reason === 'string' && reason.trim().length > 0 ? reason : null
}

export const getPrescreenResult = (listing: FlatmatesListing): string | null => {
  const result = listing.ai_prescreen_result ?? listing.listing_preferences?.ai_prescreen_result
  return typeof result === 'string' && result.trim().length > 0 ? result : null
}

export const getListingImageUrls = (listing: FlatmatesListing): string[] => {
  const urls = listing.image_urls?.length
    ? listing.image_urls
    : listing.main_image_url
      ? [listing.main_image_url]
      : []
  return Array.from(new Set(urls.filter(Boolean)))
}

export const maskPhone = (phone?: string): string => {
  if (!phone) return 'N/A'
  const trimmed = phone.trim()
  if (trimmed.length <= 4) return '****'
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`
}

export interface ApprovalBoost {
  grantedAt: string
  until: string
  reason?: string
}

export const getApprovalBoost = (listing: FlatmatesListing): ApprovalBoost | null => {
  const prefs = listing.listing_preferences
  if (!prefs || typeof prefs !== 'object') return null
  const grantedAt = prefs.approval_boost_granted_at
  const until = prefs.boosted_until
  if (typeof grantedAt !== 'string' || grantedAt.length === 0) return null
  if (typeof until !== 'string' || until.length === 0) return null
  const rawReason = prefs.boost_reason
  return {
    grantedAt,
    until,
    reason: typeof rawReason === 'string' && rawReason.trim().length > 0 ? rawReason : undefined,
  }
}

export const isApprovalBoostActive = (listing: FlatmatesListing): boolean => {
  const boost = getApprovalBoost(listing)
  if (!boost) return false
  const untilMs = new Date(boost.until).getTime()
  return !Number.isNaN(untilMs) && untilMs > Date.now()
}

export const getAiPrescreenPhotoCount = (listing: FlatmatesListing): number | null => {
  const count = listing.listing_preferences?.ai_prescreen_photo_count
  return typeof count === 'number' && Number.isFinite(count) ? count : null
}

export const getAutoPauseReason = (listing: FlatmatesListing): string | null => {
  const reason = listing.listing_preferences?.auto_paused_reason
  return typeof reason === 'string' && reason.trim().length > 0 ? reason : null
}

export interface OwnerLifestyle {
  smoking?: 'never' | 'occasionally' | 'regularly'
  drinking?: 'never' | 'occasionally' | 'regularly'
  ageBucket?: string
  nativePlace?: string
}

export const getOwnerLifestyle = (owner?: User | null): OwnerLifestyle => {
  if (!owner) return {}
  const lifestyle: OwnerLifestyle = {}
  if (owner.flatmates_smoking) lifestyle.smoking = owner.flatmates_smoking
  if (owner.flatmates_drinking) lifestyle.drinking = owner.flatmates_drinking
  if (owner.age_bucket) lifestyle.ageBucket = owner.age_bucket
  if (owner.native_place) lifestyle.nativePlace = owner.native_place
  return lifestyle
}

export interface ReportGroup {
  reportedUserId: number
  reportedUserName: string
  reports: FlatmatesReport[]
  distinctReporters: number
  reasons: string[]
}

export const groupReportsByReportedUser = (reports: FlatmatesReport[]): ReportGroup[] => {
  const groups = new Map<number, ReportGroup>()
  for (const report of reports) {
    let group = groups.get(report.reported_user_id)
    if (!group) {
      group = {
        reportedUserId: report.reported_user_id,
        reportedUserName: report.reported_user?.full_name || `User #${report.reported_user_id}`,
        reports: [],
        distinctReporters: 0,
        reasons: [],
      }
      groups.set(report.reported_user_id, group)
    }
    group.reports.push(report)
  }

  const result: ReportGroup[] = []
  for (const group of groups.values()) {
    const reporters = new Set<number>()
    const reasons = new Set<string>()
    for (const report of group.reports) {
      reporters.add(report.reporter_user_id)
      reasons.add(report.reason)
    }
    group.distinctReporters = reporters.size
    group.reasons = Array.from(reasons)
    result.push(group)
  }

  return result.sort((a, b) => b.reports.length - a.reports.length)
}
