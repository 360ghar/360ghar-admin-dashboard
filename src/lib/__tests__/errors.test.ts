import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../errors'

describe('getErrorMessage', () => {
  it('prefers nested error.message over detail', () => {
    const msg = getErrorMessage({
      status: 400,
      data: {
        error: { code: 'VALIDATION_ERROR', message: 'Title is required' },
        detail: 'should not win',
      },
    })
    expect(msg).toBe('Title is required')
  })

  it('falls back to error.code when message missing', () => {
    const msg = getErrorMessage({
      status: 401,
      data: { error: { code: 'TOKEN_INVALID' } },
    })
    expect(msg).toBe('TOKEN_INVALID')
  })

  it('falls back to FastAPI detail string', () => {
    const msg = getErrorMessage({
      status: 429,
      data: { detail: 'Rate limit exceeded' },
    })
    expect(msg).toBe('Rate limit exceeded')
  })

  it('joins Pydantic detail array messages', () => {
    const msg = getErrorMessage({
      status: 422,
      data: {
        detail: [{ msg: 'field required' }, { msg: 'value is not a valid integer' }],
      },
    })
    expect(msg).toBe('field required, value is not a valid integer')
  })

  it('uses status fallback when body empty', () => {
    expect(getErrorMessage({ status: 404, data: {} })).toBe(
      'The requested resource was not found'
    )
  })
})
