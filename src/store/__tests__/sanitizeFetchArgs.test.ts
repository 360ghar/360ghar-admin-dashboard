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

  it('returns args unchanged when params is an array or missing', () => {
    const urlOnly = { url: '/properties', params: undefined }
    expect(sanitizeFetchArgs(urlOnly)).toBe(urlOnly)

    const arrParams = { url: '/properties', params: [['q', 'x']] }
    expect(sanitizeFetchArgs(arrParams)).toBe(arrParams)
  })
})
