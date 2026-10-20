import { describe, expect, it } from 'vitest'

import type { FlatmateAdminUser } from '@/types/api'
import type { FlatmatesListing } from '../types'
import {
  getAiPrescreenPhotoCount,
  getPrescreenFlags,
  getAutoPauseReason,
  getOwnerLifestyle,
} from '../components/moderationUtils'

const makeListing = (overrides: Partial<FlatmatesListing> = {}): FlatmatesListing => ({
  id: 1,
  owner_id: 10,
  title: 'Test listing',
  status: 'pending_review',
  moderation_status: 'pending_review',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

const makeUser = (overrides: Partial<FlatmateAdminUser> = {}): FlatmateAdminUser => ({
  id: 10,
  email: 'owner@example.com',
  full_name: 'Test Owner',
  ...overrides,
})

describe('getPrescreenFlags', () => {
  it('reads flags from the typed top-level field and drops entries without a code', () => {
    expect(
      getPrescreenFlags(
        makeListing({
          ai_prescreen_flags: [
            { code: 'contact_in_text', severity: 'high', field: 'description', matched_term: '98xxxx' },
            { severity: 'warning' },
          ],
        })
      )
    ).toEqual([
      { code: 'contact_in_text', severity: 'high', reason: undefined, field: 'description', matched_term: '98xxxx' },
    ])
  })

  it('falls back to the listing_preferences copy and returns [] when there are no flags', () => {
    expect(
      getPrescreenFlags(makeListing({ ai_prescreen_flags: undefined, listing_preferences: { ai_prescreen_flags: [{ code: 'x' }] } }))
    ).toHaveLength(1)
    expect(getPrescreenFlags(makeListing({ ai_prescreen_flags: undefined }))).toEqual([])
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
