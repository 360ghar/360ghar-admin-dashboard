/**
 * Milliseconds a server asked the client to wait. `Retry-After` is either whole seconds or an HTTP date.
 * Returns null when the header is absent or not valid.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000
  const at = Date.parse(trimmed)
  return Number.isNaN(at) ? null : Math.max(0, at - now)
}
