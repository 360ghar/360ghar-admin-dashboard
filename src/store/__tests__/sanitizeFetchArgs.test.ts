import { describe, it, expect } from 'vitest'
import { sanitizeFetchArgs } from '@/store/api'

describe('sanitizeFetchArgs', () => {
  it('passes plain string urls through untouched', () => {
    expect(sanitizeFetchArgs('/properties')).toBe('/properties')
  })

  it('drops null and undefined params', () => {
    const cleaned = sanitizeFetchArgs({
      url: '/visits',
      params: { cursor: null, status: undefined, q: 'x' },
    })
    expect(cleaned).toEqual({ url: '/visits', params: { q: 'x' } })
  })

  it('drops empty-string cursor params but keeps other empty strings', () => {
    const cleaned = sanitizeFetchArgs({
      url: '/pm/properties',
      params: { cursor: '', q: '' },
    })
    expect(cleaned).toEqual({ url: '/pm/properties', params: { q: '' } })
  })

  it('keeps falsy-but-valid values like 0 and false', () => {
    const cleaned = sanitizeFetchArgs({
      url: '/pm/rent/payments',
      params: { limit: 0, as_tenant: false, cursor: 'abc' },
    })
    expect(cleaned).toEqual({
      url: '/pm/rent/payments',
      params: { limit: 0, as_tenant: false, cursor: 'abc' },
    })
  })

  it('holds limit to the backend maximum of 100 (a larger limit is a 422)', () => {
    expect(sanitizeFetchArgs({ url: '/pm/rent/charges', params: { limit: 200 } })).toEqual({
      url: '/pm/rent/charges',
      params: { limit: 100 },
    })
    expect(sanitizeFetchArgs({ url: '/pm/rent/charges', params: { limit: '250', q: 'a' } })).toEqual({
      url: '/pm/rent/charges',
      params: { limit: 100, q: 'a' },
    })
    expect(sanitizeFetchArgs({ url: '/x', params: { limit: 100 } })).toEqual({ url: '/x', params: { limit: 100 } })
    const clamped = sanitizeFetchArgs({ url: '/properties', params: new URLSearchParams({ limit: '500', status: 'sold' }) })
    expect(typeof clamped === 'string' ? null : (clamped.params as URLSearchParams).toString()).toBe('limit=100&status=sold')
  })

  it('returns args unchanged when params is an array or missing', () => {
    const urlOnly = { url: '/properties', params: undefined }
    expect(sanitizeFetchArgs(urlOnly)).toBe(urlOnly)

    const arrParams = { url: '/properties', params: [['q', 'x']] }
    expect(sanitizeFetchArgs(arrParams)).toBe(arrParams)
  })

  it('passes URLSearchParams through untouched (params are not enumerable)', () => {
    const params = new URLSearchParams({ status: 'available', limit: '1' })
    const args = { url: '/properties', params }
    // Regression: Object.entries() sees no own keys on a URLSearchParams
    // instance, so the plain-object path would strip every query param.
    expect(sanitizeFetchArgs(args)).toBe(args)
  })
})
