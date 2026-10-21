import { describe, expect, it } from 'vitest'
import { parseRetryAfter } from '../retryAfter'

describe('parseRetryAfter', () => {
  it('reads whole seconds', () => {
    expect(parseRetryAfter('5')).toBe(5000)
  })

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('2026-10-16T10:00:00Z')
    expect(parseRetryAfter('Fri, 16 Oct 2026 10:00:30 GMT', now)).toBe(30_000)
    expect(parseRetryAfter('Fri, 16 Oct 2026 09:00:00 GMT', now)).toBe(0)
  })

  it('returns null when absent or invalid', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('')).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })
})
