import { describe, expect, it } from 'vitest'

import type { FlatmatesReport } from '../types'
import { groupReportsByReportedUser } from '../components/moderationUtils'

const makeReport = (overrides: Partial<FlatmatesReport> = {}): FlatmatesReport => ({
  id: 1,
  reporter_user_id: 100,
  reported_user_id: 200,
  reason: 'spam',
  status: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('groupReportsByReportedUser', () => {
  it('groups reports by reported_user_id', () => {
    const groups = groupReportsByReportedUser([
      makeReport({ id: 1, reported_user_id: 200, reporter_user_id: 100 }),
      makeReport({ id: 2, reported_user_id: 200, reporter_user_id: 101 }),
      makeReport({ id: 3, reported_user_id: 300, reporter_user_id: 100 }),
    ])
    expect(groups).toHaveLength(2)
    const user200 = groups.find((group) => group.reportedUserId === 200)
    const user300 = groups.find((group) => group.reportedUserId === 300)
    expect(user200?.reports.map((report) => report.id)).toEqual([1, 2])
    expect(user300?.reports.map((report) => report.id)).toEqual([3])
  })

  it('counts distinct reporters per group', () => {
    const groups = groupReportsByReportedUser([
      makeReport({ reported_user_id: 200, reporter_user_id: 100 }),
      makeReport({ reported_user_id: 200, reporter_user_id: 101 }),
      makeReport({ reported_user_id: 200, reporter_user_id: 100 }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].distinctReporters).toBe(2)
  })

  it('dedupes reasons within a group', () => {
    const groups = groupReportsByReportedUser([
      makeReport({ reported_user_id: 200, reason: 'spam' }),
      makeReport({ reported_user_id: 200, reason: 'spam' }),
      makeReport({ reported_user_id: 200, reason: 'abuse' }),
    ])
    expect(groups[0].reasons).toEqual(['spam', 'abuse'])
  })

  it('sorts groups by report count descending', () => {
    const groups = groupReportsByReportedUser([
      makeReport({ id: 1, reported_user_id: 200 }),
      makeReport({ id: 2, reported_user_id: 200 }),
      makeReport({ id: 3, reported_user_id: 200 }),
      makeReport({ id: 4, reported_user_id: 300 }),
      makeReport({ id: 5, reported_user_id: 400 }),
      makeReport({ id: 6, reported_user_id: 400 }),
    ])
    expect(groups.map((group) => group.reportedUserId)).toEqual([200, 400, 300])
  })

  it('derives reportedUserName from reported_user when present', () => {
    const groups = groupReportsByReportedUser([
      makeReport({
        reported_user_id: 200,
        reported_user: {
          id: 200,
          email: 'jane@example.com',
          full_name: 'Jane Doe',
          role: 'user',
          is_active: true,
          is_verified: true,
          supabase_user_id: 'supabase-id',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      }),
    ])
    expect(groups[0].reportedUserName).toBe('Jane Doe')
  })

  it('falls back to a user id label when reported_user is absent', () => {
    const groups = groupReportsByReportedUser([makeReport({ reported_user_id: 200 })])
    expect(groups[0].reportedUserName).toBe('User #200')
  })

  it('returns an empty array for empty input', () => {
    expect(groupReportsByReportedUser([])).toEqual([])
  })
})
