import { useGetUsersQuery } from '@/features/users/api/usersApi'

/**
 * Owner (role: 'user') search against `/users`, shared by `OwnerSelector`
 * and `PmOwnersPage` so both build the exact same query args — the RTK
 * Query cache key is structurally guaranteed to match on the initial page
 * instead of relying on both call sites happening to pass identical
 * literals. Callers debounce their own search input before passing it in,
 * since each has its own debounce delay.
 */
export function useOwnersSearch(debouncedQ: string, { cursor = null, skip = false }: { cursor?: string | null; skip?: boolean } = {}) {
  return useGetUsersQuery({ cursor, limit: 20, q: debouncedQ || undefined }, { skip })
}
