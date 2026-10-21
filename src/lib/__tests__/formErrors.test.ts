import { describe, it, expect, vi } from 'vitest'
import { applyServerValidation, extractFieldErrors } from '@/lib/formErrors'

const validation = (fields: Array<{ field: string; msg: string; type?: string }>) => ({
  status: 422,
  data: {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: { fields: fields.map((item) => ({ type: 'value_error', ...item })) },
    },
  },
})

describe('extractFieldErrors', () => {
  it('parses a 422 envelope, stripping the body/query/path prefix', () => {
    const error = validation([
      { field: 'body.title', msg: 'field required' },
      { field: 'body.price', msg: 'must be positive' },
      { field: 'query.limit', msg: 'too large' },
    ])
    expect(extractFieldErrors(error)).toEqual({ title: 'Field required', price: 'Must be positive', limit: 'Too large' })
  })

  it('keeps the first message for a field and nested field paths', () => {
    const error = validation([
      { field: 'body.filter.role', msg: 'bad role' },
      { field: 'body.filter.role', msg: 'second' },
    ])
    expect(extractFieldErrors(error)).toEqual({ 'filter.role': 'Bad role' })
  })

  it('does not read the old detail array or errors map', () => {
    expect(extractFieldErrors({ status: 422, data: { detail: [{ loc: ['body', 'title'], msg: 'field required' }] } })).toEqual({})
    expect(extractFieldErrors({ status: 400, data: { errors: { email: ['already taken'] } } })).toEqual({})
  })

  it('returns an empty object for non-validation errors', () => {
    expect(extractFieldErrors({ status: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'boom' } } })).toEqual({})
    expect(extractFieldErrors('network down')).toEqual({})
  })
})

describe('applyServerValidation', () => {
  it('maps field errors via setError and returns true', () => {
    const setError = vi.fn()
    const applied = applyServerValidation(validation([{ field: 'body.title', msg: 'field required' }]), setError)
    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledWith('title', { type: 'server', message: 'Field required' })
  })

  it('routes a generic error to the form root and returns false', () => {
    const setError = vi.fn()
    const error = { status: 400, data: { error: { code: 'BAD_REQUEST', message: 'Bad request happened' } } }
    const applied = applyServerValidation(error, setError)
    expect(applied).toBe(false)
    expect(setError).toHaveBeenCalledWith('root', { type: 'server', message: 'Bad request happened' })
  })

  it('folds unknown server fields into the root error when knownFields is set', () => {
    const setError = vi.fn()
    const applied = applyServerValidation(validation([{ field: 'body.secret', msg: 'nope' }]), setError, { knownFields: ['title'] })
    expect(applied).toBe(false)
    expect(setError).toHaveBeenCalledWith('root', { type: 'server', message: 'Nope' })
  })

  it('renames server fields to form fields with fieldMap before checking knownFields', () => {
    const setError = vi.fn()
    const applied = applyServerValidation(
      validation([{ field: 'body.deep_link', msg: 'too long' }]),
      setError,
      { knownFields: ['route'], fieldMap: { deep_link: 'route' } },
    )
    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledWith('route', { type: 'server', message: 'Too long' })
  })
})
