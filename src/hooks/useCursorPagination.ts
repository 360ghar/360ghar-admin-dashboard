import { useCallback, useRef, useState } from 'react'

/**
 * Cursor-based pagination helper for list pages that navigate one page at a
 * time (Prev/Next) using opaque backend cursors.
 *
 * The backend returns `{items, next_cursor, has_more, limit}`. `next_cursor`
 * is opaque base64 and is never decoded on the client. Because the backend
 * does not support a "previous" cursor, backwards navigation is implemented
 * with a client-side cursor history stack: before advancing to the next page
 * we push the current cursor onto the stack, and `prev()` pops it.
 *
 * Pass `resetKey` (filter/limit identity) so the cursor resets **during render**
 * when filters change. Using `useEffect(() => reset())` is too late — RTK Query
 * would fire one request with the new filters + the old page cursor.
 *
 * Usage:
 *   const pager = useCursorPagination(`${dq}|${status}|${pageSize}`)
 *   const { data } = useListXQuery({ cursor: pager.cursor, ... })
 *   pager.next(data.next_cursor)
 *   pager.prev()
 */
export interface CursorPager {
  /** Cursor for the currently displayed page (null = first page). */
  cursor: string | null
  /** True when there is a previous page in the history stack. */
  canPrev: boolean
  /** Advance to the next page using the `next_cursor` from the current response. */
  next: (nextCursor: string | null | undefined) => void
  /** Pop the history stack and return to the previous page. */
  prev: () => void
  /** Reset to the first page (clears cursor and history). Prefer resetKey over manual reset. */
  reset: () => void
}

export function useCursorPagination(resetKey?: unknown): CursorPager {
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<(string | null)[]>([])
  const [prevKey, setPrevKey] = useState(resetKey)

  // Effective values for THIS render (so queries never see a stale cursor after a filter change).
  let displayCursor = cursor
  let displayHistory = history

  if (!Object.is(resetKey, prevKey)) {
    setPrevKey(resetKey)
    setCursor(null)
    setHistory([])
    displayCursor = null
    displayHistory = []
  }

  const cursorRef = useRef(displayCursor)
  cursorRef.current = displayCursor

  const next = useCallback((nextCursor: string | null | undefined) => {
    // Never advance without a real cursor — avoids looping back to page 1 mid-session.
    if (nextCursor == null || nextCursor === '') return
    setHistory((h) => [...h, cursorRef.current])
    setCursor(nextCursor)
  }, [])

  const prev = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prevCursor = h[h.length - 1]
      setCursor(prevCursor)
      return h.slice(0, -1)
    })
  }, [])

  const reset = useCallback(() => {
    setCursor(null)
    setHistory([])
  }, [])

  return {
    cursor: displayCursor,
    canPrev: displayHistory.length > 0,
    next,
    prev,
    reset,
  }
}
