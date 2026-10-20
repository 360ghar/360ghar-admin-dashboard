import type { User } from '@/types'
// Re-export CSV helpers from the shared lib for backward compatibility.
// New code should import directly from `@/lib/csv`.
export { downloadCsv, csvFilename } from '@/lib/csv'

/**
 * Owner label. The selected owner is saved in local storage, so the label never falls back to
 * the owner's phone or email: no contact data is stored on this machine.
 */
export const getOwnerLabel = (u: Pick<User, 'id' | 'full_name'>) => u.full_name?.trim() || `Owner #${u.id}`

/** An HTML month input gives `YYYY-MM`. Charge generation takes the first day of the month: `YYYY-MM-01`. */
export const monthToFirstDay = (month: string) => `${month}-01`
