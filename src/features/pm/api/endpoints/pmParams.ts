import { DEFAULT_PAGE_SIZE } from '@/features/pm/constants'

/**
 * Query params for a PM list read. The args are typed from the spec, so only declared keys
 * reach the wire. `limit` falls back to the page-size default; the backend maximum is 100.
 */
export function withPageLimit<T extends { limit?: number }>(args: T): T & { limit: number } {
  return { ...args, limit: args.limit ?? DEFAULT_PAGE_SIZE }
}
