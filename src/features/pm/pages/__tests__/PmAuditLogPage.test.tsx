import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActivityItem } from '@/types/pm'
import PmAuditLogPage from '../PmAuditLogPage'

const mocks = vi.hoisted(() => ({ args: vi.fn(), hasMore: true }))

const item = (title: string, at: string): ActivityItem => ({
  type: 'rent_payment',
  at,
  title,
  description: null,
  status: 'settled',
  amount: null,
  property_id: 1,
  lease_id: 2,
}) as ActivityItem

// One event just before midnight UTC and one just after. In a time zone east of UTC both fall on the
// same local day, so only a UTC-day filter keeps them apart.
const rows = [item('Before midnight', '2026-10-01T23:30:00Z'), item('After midnight', '2026-10-02T00:30:00Z')]

vi.mock('@/hooks/redux', () => ({ useAppSelector: () => 20 }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/FadeContent', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/components/OwnerScopeGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/api/pmApi', () => ({
  useGetPmDashboardActivityQuery: (args: unknown) => {
    mocks.args(args)
    return {
      currentData: { items: rows, has_more: mocks.hasMore, next_cursor: mocks.hasMore ? 'c2' : null },
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }
  },
}))

describe('PmAuditLogPage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })
  beforeEach(() => {
    mocks.args.mockReset()
    mocks.hasMore = true
  })

  it('keeps the events of the From day and later (UTC day)', () => {
    render(<PmAuditLogPage />)
    expect(screen.getByText('Before midnight')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-02' } })
    expect(screen.queryByText('Before midnight')).not.toBeInTheDocument()
    expect(screen.getByText('After midnight')).toBeInTheDocument()
  })

  it('includes the whole To day (UTC day)', () => {
    render(<PmAuditLogPage />)
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } })
    expect(screen.getByText('Before midnight')).toBeInTheDocument()
    expect(screen.queryByText('After midnight')).not.toBeInTheDocument()
  })

  it('reads the next page with the cursor of the first page', async () => {
    render(<PmAuditLogPage />)
    expect(mocks.args).toHaveBeenLastCalledWith({ owner_id: 20, limit: 50, cursor: null })
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(mocks.args).toHaveBeenLastCalledWith({ owner_id: 20, limit: 50, cursor: 'c2' }))
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('shows no pager when everything fits on one page', () => {
    mocks.hasMore = false
    render(<PmAuditLogPage />)
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
