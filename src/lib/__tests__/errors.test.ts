import { describe, expect, it } from 'vitest'
import { getErrorCode, getErrorMessage, getFieldErrors } from '../errors'

describe('getErrorMessage', () => {
  it('reads error.message from the envelope', () => {
    const msg = getErrorMessage({
      status: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: 'Title is required' } },
    })
    expect(msg).toBe('Title is required')
  })

  it('falls back to error.code when message is missing', () => {
    const msg = getErrorMessage({
      status: 401,
      data: { error: { code: 'TOKEN_INVALID' } },
    })
    expect(msg).toBe('TOKEN_INVALID')
  })

  it('does not read the old FastAPI detail shapes', () => {
    expect(getErrorMessage({ status: 429, data: { detail: 'Rate limit exceeded' } })).toBe(
      'Too many requests. Please wait a moment and try again.',
    )
    expect(getErrorMessage({ status: 422, data: { detail: [{ msg: 'field required' }] } })).toBe(
      'Validation error. Please check your inputs and try again.',
    )
  })

  it('uses status fallback when body empty', () => {
    expect(getErrorMessage({ status: 404, data: {} })).toBe(
      'This record no longer exists. Return to the list.'
    )
  })

  it('gives a recovery action for transport, timeout, parsing, and cancellation failures', () => {
    expect(getErrorMessage({ status: 'FETCH_ERROR', error: 'Failed to fetch' })).toMatch(/Check your connection/)
    expect(getErrorMessage({ status: 'TIMEOUT_ERROR', error: 'timeout' })).toMatch(/timed out/)
    expect(getErrorMessage({ status: 'PARSING_ERROR', error: 'bad JSON' })).toMatch(/invalid response/)
    expect(getErrorMessage({ status: 'FETCH_ERROR', error: 'AbortError' })).toMatch(/cancelled/)
  })
})

describe('getErrorCode and getFieldErrors', () => {
  it('returns the domain code of the envelope', () => {
    expect(getErrorCode({ status: 409, data: { error: { code: 'PAGE_EXISTS', message: 'x' } } })).toBe('PAGE_EXISTS')
    expect(getErrorCode({ status: 500, data: {} })).toBeNull()
    expect(getErrorCode('nope')).toBeNull()
  })

  it('returns the 422 field list and ignores malformed entries', () => {
    const error = {
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { fields: [{ field: 'body.price', msg: 'must be positive', type: 'value_error' }, { field: 7 }, null] },
        },
      },
    }
    expect(getFieldErrors(error)).toEqual([{ field: 'body.price', msg: 'must be positive', type: 'value_error' }])
    expect(getFieldErrors({ status: 400, data: { error: { code: 'X', message: 'y' } } })).toEqual([])
  })
})
