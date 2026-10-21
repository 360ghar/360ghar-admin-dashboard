import { describe, it, expect, vi } from 'vitest'
import { fetchUserProfileWithStatus, isEmail, normalizePhone, normalizeIdentifier, isAllowedGoogleEmail } from '@/lib/auth'
import { loadCachedProfile, profileStorageKey } from '@/features/auth/slices/authSlice'
import { writeVersionedJSON } from '@/lib/storage'
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

describe('loadCachedProfile', () => {
  const accountId = 'supabase-a'
  const profile = { id: 1, supabase_user_id: accountId, full_name: 'Test' }

  it('returns null when nothing is stored', () => {
    localStorage.clear()
    expect(loadCachedProfile(accountId)).toBeNull()
  })

  it('returns an account-bound identity hint', () => {
    writeVersionedJSON(profileStorageKey(accountId), 1, profile)
    expect(loadCachedProfile(accountId)).toEqual(profile)
  })

  it('clears corrupt payloads and returns null', () => {
    localStorage.setItem(profileStorageKey(accountId), '{not-json')
    expect(loadCachedProfile(accountId)).toBeNull()
    expect(localStorage.getItem(profileStorageKey(accountId))).toBeNull()
  })

  it('rejects malformed and mismatched profiles', () => {
    writeVersionedJSON(profileStorageKey(accountId), 1, { full_name: 'No Id' })
    expect(loadCachedProfile(accountId)).toBeNull()
    writeVersionedJSON(profileStorageKey(accountId), 1, { ...profile, supabase_user_id: 'other' })
    expect(loadCachedProfile(accountId)).toBeNull()
    expect(localStorage.getItem(profileStorageKey(accountId))).toBeNull()
  })
})

describe('fetchUserProfileWithStatus', () => {
  it('rejects a malformed profile and one bound to another Supabase account', async () => {
    const profile = {
      id: 1,
      supabase_user_id: 'account-a',
      email: 'staff@example.com',
      full_name: 'Staff',
      role: 'admin',
      is_active: true,
      is_verified: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    vi.stubGlobal('fetch', fetchMock)
    try {
      expect((await fetchUserProfileWithStatus('token', 'account-b')).user).toBeNull()
      expect((await fetchUserProfileWithStatus('token', 'account-a')).user).toMatchObject(profile)
      fetchMock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify({
        ...profile,
        email: null,
        full_name: null,
        updated_at: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })))
      // The backend allows a null email, name and update time. The portal keeps them null.
      expect((await fetchUserProfileWithStatus('token', 'account-a')).user).toMatchObject({
        email: null,
        full_name: null,
        updated_at: null,
      })
      fetchMock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })))
      expect((await fetchUserProfileWithStatus('token', 'account-a')).user).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
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
