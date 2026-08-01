import type { User } from '@/types'
// Re-export CSV helpers from the shared lib for backward compatibility.
// New code should import directly from `@/lib/csv`.
export { downloadCsv, csvFilename } from '@/lib/csv'

export const getOwnerLabel = (u: Pick<User, 'full_name' | 'phone' | 'email'>) =>
  (u.full_name || u.phone || u.email || 'Unnamed owner').trim()

export const getKycStatus = (u: User): string => {
  const prefs = u.preferences as unknown as Record<string, unknown> | undefined
  const raw = prefs?.pm_kyc_status ?? prefs?.kyc_status
  return typeof raw === 'string' && raw.trim() ? raw : 'unknown'
}
