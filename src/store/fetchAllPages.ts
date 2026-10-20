import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { MAX_PAGE_LIMIT, type CursorPage } from '@/types/api'

type MaybePromise<T> = T | PromiseLike<T>

/** The `baseQuery` argument that RTK Query hands to a `queryFn`. */
type PageBaseQuery = (
  arg: FetchArgs,
) => MaybePromise<{ data: unknown; error?: undefined } | { error: FetchBaseQueryError; data?: undefined }>

/** Upper bound on pages in one walk. A server that keeps returning `has_more` must not loop forever. */
const MAX_PAGES = 100

function isCursorPage(value: unknown): value is CursorPage<unknown> {
  if (typeof value !== 'object' || value === null) return false
  const page = value as { items?: unknown; has_more?: unknown; next_cursor?: unknown }
  return Array.isArray(page.items) && typeof page.has_more === 'boolean'
}

/**
 * Read every row of a cursor-paginated list: request `limit` 100 and follow
 * `next_cursor` while `has_more` is true. Use it for reads that need the whole
 * set (workload maps, option lists). Send the same filters on every page,
 * because a cursor is bound to its filters.
 *
 * Intended for `queryFn`: pass the `baseQuery` argument through, so auth,
 * the 401 refresh and the limit clamp apply to every page.
 */
export async function fetchAllPages<T>(
  baseQuery: PageBaseQuery,
  url: string,
  params: Record<string, unknown> = {},
): Promise<{ data: T[]; error?: undefined } | { error: FetchBaseQueryError; data?: undefined }> {
  const items: T[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await baseQuery({ url, params: { ...params, limit: MAX_PAGE_LIMIT, cursor } })
    if (result.error) return { error: result.error }
    if (!isCursorPage(result.data)) {
      return { error: { status: 'PARSING_ERROR', originalStatus: 200, data: String(result.data), error: 'Expected a cursor page' } }
    }
    items.push(...(result.data.items as T[]))
    if (!result.data.has_more || !result.data.next_cursor) return { data: items }
    cursor = result.data.next_cursor
  }
  return { data: items }
}
