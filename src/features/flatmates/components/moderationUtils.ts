import type { FlatmateAdminUser } from '@/types/api'
import { isRecord } from '@/lib/storage'
import type { FlatmatesListing, FlatmatesReport } from '../types'

/** One AI prescreen flag. The response types the flags as free objects, so they are read field by field. */
export interface PrescreenFlag {
  code: string
  severity?: 'warning' | 'high'
  reason?: string
  field?: string
  matched_term?: string
}

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined)

const toPrescreenFlag = (value: unknown): PrescreenFlag | null => {
  if (!isRecord(value)) return null
  const code = text(value.code)
  if (!code) return null
  const severity = value.severity === 'high' || value.severity === 'warning' ? value.severity : undefined
  return { code, severity, reason: text(value.reason), field: text(value.field), matched_term: text(value.matched_term) }
}

export const getPrescreenFlags = (listing: FlatmatesListing): PrescreenFlag[] => {
  const raw = Array.isArray(listing.ai_prescreen_flags)
    ? listing.ai_prescreen_flags
    : listing.listing_preferences?.ai_prescreen_flags
  return Array.isArray(raw)
    ? raw.flatMap((flag: unknown) => {
        const parsed = toPrescreenFlag(flag)
        return parsed ? [parsed] : []
      })
    : []
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

export const maskPhone = (phone?: string | null): string => {
  if (!phone) return 'N/A'
  const trimmed = phone.trim()
  if (trimmed.length <= 4) return '****'
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`
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
  smoking?: string
  drinking?: string
  ageBucket?: string
  nativePlace?: string
}

export const getOwnerLifestyle = (owner?: FlatmateAdminUser | null): OwnerLifestyle => {
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
  reasons: FlatmatesReport['reason'][]
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
    const reasons = new Set<FlatmatesReport['reason']>()
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
