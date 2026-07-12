import { describe, it, expect } from 'vitest'
import { isEmail, normalizePhone, normalizeIdentifier, isAllowedGoogleEmail } from '@/lib/auth'
import { loadUserFromStorage } from '@/features/auth/slices/authSlice'
import { passwordStepSchema, setPasswordStepSchema } from '@/features/auth/validations'

describe('isEmail', () => {
  it('detects emails by @', () => {
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('user@360ghar.com')).toBe(true)
  })

  it('returns false for phone-like values', () => {
    expect(isEmail('+919876543210')).toBe(false)
    expect(isEmail('9876543210')).toBe(false)
  })
})

describe('normalizePhone', () => {
  it('prepends +91 for 10-digit Indian mobiles', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210')
    expect(normalizePhone('98765 43210')).toBe('+919876543210')
  })

  it('keeps an existing + prefix', () => {
    expect(normalizePhone('+14155551212')).toBe('+14155551212')
  })

  it('returns empty for blank input', () => {
    expect(normalizePhone('')).toBe('')
    expect(normalizePhone('   ')).toBe('')
  })

  it('adds + when digits are non-10-length without +', () => {
    expect(normalizePhone('919876543210')).toBe('+919876543210')
  })
})

describe('normalizeIdentifier', () => {
  it('lowercases and trims emails', () => {
    expect(normalizeIdentifier('  Alice@360Ghar.COM ', 'email')).toBe('alice@360ghar.com')
  })

  it('normalizes phones via normalizePhone', () => {
    expect(normalizeIdentifier('9876543210', 'phone')).toBe('+919876543210')
  })
})

describe('loadUserFromStorage', () => {
  it('returns null when nothing is stored', () => {
    localStorage.clear()
    expect(loadUserFromStorage()).toBeNull()
  })

  it('returns a user when a valid payload is stored', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', full_name: 'Test' }))
    const user = loadUserFromStorage()
    expect(user?.id).toBe('u1')
  })

  it('clears corrupt payloads and returns null', () => {
    localStorage.setItem('user', '{not-json')
    expect(loadUserFromStorage()).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('rejects objects without id', () => {
    localStorage.setItem('user', JSON.stringify({ full_name: 'No Id' }))
    expect(loadUserFromStorage()).toBeNull()
  })
})

describe('password schemas', () => {
  it('login password step only requires a non-empty password', () => {
    expect(passwordStepSchema.safeParse({ password: 'x' }).success).toBe(true)
    expect(passwordStepSchema.safeParse({ password: '' }).success).toBe(false)
  })

  it('set-password enforces complexity and match', () => {
    expect(
      setPasswordStepSchema.safeParse({ password: 'weak', confirm_password: 'weak' }).success,
    ).toBe(false)
    expect(
      setPasswordStepSchema.safeParse({
        password: 'Strong1pass',
        confirm_password: 'Strong1pass',
      }).success,
    ).toBe(true)
    expect(
      setPasswordStepSchema.safeParse({
        password: 'Strong1pass',
        confirm_password: 'Other1pass',
      }).success,
    ).toBe(false)
  })
})

describe('isAllowedGoogleEmail', () => {
  it('is re-exported from auth and rejects empty', () => {
    expect(isAllowedGoogleEmail(null)).toBe(false)
  })
})
