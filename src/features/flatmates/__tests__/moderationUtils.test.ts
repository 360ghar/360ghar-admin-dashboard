import { describe, expect, it } from 'vitest'

import type { User } from '@/types/api'
import type { FlatmatesListing } from '../types'
import {
  getAiPrescreenPhotoCount,
  getApprovalBoost,
  getAutoPauseReason,
  getOwnerLifestyle,
  isApprovalBoostActive,
} from '../components/moderationUtils'

const makeListing = (overrides: Partial<FlatmatesListing> = {}): FlatmatesListing => ({
  id: 1,
  owner_id: 10,
  title: 'Test listing',
  status: 'pending_review',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 10,
  email: 'owner@example.com',
  full_name: 'Test Owner',
  role: 'user',
  is_active: true,
  is_verified: true,
  supabase_user_id: 'supabase-id',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('getApprovalBoost', () => {
  it('returns null when listing_preferences is missing', () => {
    expect(getApprovalBoost(makeListing())).toBeNull()
  })

  it('returns null when boost fields are absent', () => {
    expect(getApprovalBoost(makeListing({ listing_preferences: { foo: 'bar' } }))).toBeNull()
  })

  it('parses boost when present', () => {
    const boost = getApprovalBoost(
      makeListing({
        listing_preferences: {
          approval_boost_granted_at: '2025-01-01T00:00:00Z',
          boosted_until: '2025-02-01T00:00:00Z',
          boost_reason: 'high engagement',
        },
      })
    )
    expect(boost).toEqual({
      grantedAt: '2025-01-01T00:00:00Z',
      until: '2025-02-01T00:00:00Z',
      reason: 'high engagement',
    })
  })

  it('omits reason when it is not a non-empty string', () => {
    const boost = getApprovalBoost(
      makeListing({
        listing_preferences: {
          approval_boost_granted_at: '2025-01-01T00:00:00Z',
          boosted_until: '2025-02-01T00:00:00Z',
          boost_reason: 123,
        },
      })
    )
    expect(boost).toEqual({
      grantedAt: '2025-01-01T00:00:00Z',
      until: '2025-02-01T00:00:00Z',
      reason: undefined,
    })
  })
})

describe('isApprovalBoostActive', () => {
  it('is active when boosted_until is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(
      isApprovalBoostActive(
        makeListing({
          listing_preferences: {
            approval_boost_granted_at: '2025-01-01T00:00:00Z',
            boosted_until: future,
          },
        })
      )
    ).toBe(true)
  })

  it('is not active when boosted_until is in the past', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    expect(
      isApprovalBoostActive(
        makeListing({
          listing_preferences: {
            approval_boost_granted_at: '2025-01-01T00:00:00Z',
            boosted_until: past,
          },
        })
      )
    ).toBe(false)
  })

  it('is not active when boost is missing', () => {
    expect(isApprovalBoostActive(makeListing())).toBe(false)
  })
})

describe('getAiPrescreenPhotoCount', () => {
  it('returns the count when present', () => {
    expect(
      getAiPrescreenPhotoCount(makeListing({ listing_preferences: { ai_prescreen_photo_count: 7 } }))
    ).toBe(7)
  })

  it('returns null when absent or not a number', () => {
    expect(getAiPrescreenPhotoCount(makeListing())).toBeNull()
    expect(
      getAiPrescreenPhotoCount(makeListing({ listing_preferences: { ai_prescreen_photo_count: '7' } }))
    ).toBeNull()
  })
})

describe('getAutoPauseReason', () => {
  it('returns stale_listing when auto-paused for inactivity', () => {
    expect(
      getAutoPauseReason(makeListing({ listing_preferences: { auto_paused_reason: 'stale_listing' } }))
    ).toBe('stale_listing')
  })

  it('returns null when absent or empty', () => {
    expect(getAutoPauseReason(makeListing())).toBeNull()
    expect(getAutoPauseReason(makeListing({ listing_preferences: { auto_paused_reason: '' } }))).toBeNull()
  })
})

describe('getOwnerLifestyle', () => {
  it('returns populated lifestyle from owner fields', () => {
    expect(
      getOwnerLifestyle(
        makeUser({
          flatmates_smoking: 'occasionally',
          flatmates_drinking: 'never',
          age_bucket: '26-30',
          native_place: 'Mumbai',
        })
      )
    ).toEqual({
      smoking: 'occasionally',
      drinking: 'never',
      ageBucket: '26-30',
      nativePlace: 'Mumbai',
    })
  })

  it('returns empty object when owner has no lifestyle fields', () => {
    expect(getOwnerLifestyle(makeUser())).toEqual({})
  })

  it('returns empty object when owner is missing', () => {
    expect(getOwnerLifestyle()).toEqual({})
    expect(getOwnerLifestyle(null)).toEqual({})
  })
})
