import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Expense } from '@/types/pm'
import PmExpensesPage from '../PmExpensesPage'

const mocks = vi.hoisted(() => ({ ownerId: 20 }))

const oldExpense: Expense = {
  id: 1,
  property_id: 10,
  owner_id: 20,
  category: 'repairs',
  amount: 500,
  expense_date: '2026-01-01',
  created_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/hooks/redux', () => ({ useAppSelector: () => mocks.ownerId }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/features/pm/components/OwnerScopeGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/components/CreateExpenseDialog', () => ({ default: () => null }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/CountUp', () => ({ default: ({ to }: { to: number }) => <span>{to}</span> }))
vi.mock('@/components/ui/responsive-data-table', () => ({
  ResponsiveDataTable: ({ data }: { data: Expense[] }) => (
    <div>{data.map((expense) => <button key={expense.id}>Delete expense #{expense.id}</button>)}</div>
  ),
}))
vi.mock('@/features/pm/api/pmApi', () => ({
  useListPmExpensesQuery: ({ owner_id }: { owner_id: number | null }) => ({
    data: { items: [oldExpense], has_more: false, next_cursor: null, limit: 50 },
    currentData: owner_id === 20 ? { items: [oldExpense], has_more: false, next_cursor: null, limit: 50 } : undefined,
    isFetching: owner_id !== 20,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdatePmExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useDeletePmExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useUploadPmDocumentMutation: () => [vi.fn(), { isLoading: false }],
}))

describe('PmExpensesPage owner scope', () => {
  beforeEach(() => { mocks.ownerId = 20 })

  it('hides prior-owner rows and actions while the new owner loads', () => {
    const { rerender } = render(<PmExpensesPage />)
    expect(screen.getByRole('button', { name: 'Delete expense #1' })).toBeInTheDocument()

    mocks.ownerId = 21
    rerender(<PmExpensesPage />)
    expect(screen.queryByRole('button', { name: 'Delete expense #1' })).not.toBeInTheDocument()
  })
})
