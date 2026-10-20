import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PmReportsPage from '../PmReportsPage'

const mocks = vi.hoisted(() => ({
  loadAll: vi.fn(),
  downloadCsv: vi.fn(),
  rentRollArgs: vi.fn(),
  incomeArgs: vi.fn(),
  pnlArgs: vi.fn(),
  toast: vi.fn(),
}))

const rows = Array.from({ length: 20 }, (_, i) => ({
  property_id: i + 1,
  title: `Flat ${i + 1}`,
  occupancy: i % 2 ? 'occupied' : 'vacant',
  monthly_rent: 1000 + i,
  lease_end_date: null,
}))

const ok = { currentData: undefined, isFetching: false, isError: false, refetch: vi.fn() }

vi.mock('@/hooks/redux', () => ({ useAppSelector: () => 7 }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/CountUp', () => ({ default: ({ to }: { to: number }) => <span>{to}</span> }))
vi.mock('@/features/pm/components/OwnerScopeGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/utils', () => ({ downloadCsv: mocks.downloadCsv }))
vi.mock('@/features/pm/api/pmApi', () => ({
  useGetRentRollReportQuery: (args: unknown) => {
    mocks.rentRollArgs(args)
    return { ...ok, currentData: { items: rows.slice(0, 20), has_more: true, next_cursor: 'c2', limit: 100, total: 130 } }
  },
  useLazyGetAllRentRollItemsQuery: () => [mocks.loadAll],
  useGetIncomeReportQuery: (args: unknown) => {
    mocks.incomeArgs(args)
    return { ...ok, currentData: { total_income: 100 } }
  },
  useGetExpenseReportQuery: () => ({ ...ok, currentData: { total_expenses: 40 } }),
  useGetPnLReportQuery: (args: unknown) => {
    mocks.pnlArgs(args)
    return { ...ok, currentData: { total_income: 100, total_expenses: 40, net_income: 60 } }
  },
  useGetOccupancyReportQuery: () => ({ ...ok, currentData: { total: 2, occupied: 1, vacant: 1 } }),
  useGetMaintenanceReportQuery: () => ({ ...ok, currentData: { total_requests: 3 } }),
}))

describe('PmReportsPage rent roll', () => {
  beforeEach(() => {
    mocks.loadAll.mockReset()
    mocks.downloadCsv.mockReset()
    mocks.toast.mockReset()
    mocks.rentRollArgs.mockReset()
    mocks.loadAll.mockImplementation(() => ({ unwrap: () => Promise.resolve(rows) }))
  })

  it('reads the rent roll as a cursor page: previews 15 rows of the first page', () => {
    render(<PmReportsPage />)
    expect(mocks.rentRollArgs).toHaveBeenLastCalledWith({ owner_id: 7, limit: 100, include_total: true })
    expect(screen.getByText('Flat 1')).toBeInTheDocument()
    expect(screen.getByText('Flat 15')).toBeInTheDocument()
    expect(screen.queryByText('Flat 16')).not.toBeInTheDocument()
    expect(screen.getByText(/Showing first 15 of 130 rows/)).toBeInTheDocument()
  })

  it('exports every page, not only the preview', async () => {
    render(<PmReportsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
    await waitFor(() => expect(mocks.downloadCsv).toHaveBeenCalledTimes(1))
    expect(mocks.loadAll).toHaveBeenCalledWith({ owner_id: 7 })
    const exported = mocks.downloadCsv.mock.calls[0][1] as unknown[]
    expect(exported).toHaveLength(20)
    expect(exported[0]).toMatchObject({ property_id: 1, title: 'Flat 1', occupancy: 'vacant', monthly_rent: 1000 })
  })

  it('sends the same date range to income and P&L', () => {
    render(<PmReportsPage />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('End (inclusive)'), { target: { value: '2026-01-31' } })
    const range = { owner_id: 7, start: '2026-01-01', end: '2026-01-31' }
    expect(mocks.incomeArgs).toHaveBeenLastCalledWith(range)
    expect(mocks.pnlArgs).toHaveBeenLastCalledWith(range)
  })
})
