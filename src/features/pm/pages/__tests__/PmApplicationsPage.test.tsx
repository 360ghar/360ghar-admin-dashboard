import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PmApplicationsPage from '../PmApplicationsPage'

const mocks = vi.hoisted(() => ({
  applicationsArgs: vi.fn(),
  formsArgs: vi.fn(),
}))

vi.mock('@/hooks/redux', () => ({ useAppSelector: () => 20 }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/features/pm/components/OwnerScopeGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/components/CreateApplicationFormDialog', () => ({ CreateApplicationFormDialog: () => null }))
vi.mock('@/features/pm/components/ApplicationTable', () => ({
  ApplicationTable: ({ tab, formId, onClearForm }: { tab: string; formId: number | null; onClearForm: () => void }) => (
    <div>
      <span>tab:{tab}</span>
      <span>form:{String(formId)}</span>
      <button onClick={onClearForm}>Clear form filter</button>
    </div>
  ),
}))
vi.mock('@/features/pm/api/pmApi', () => {
  const query = { currentData: { items: [], has_more: false, next_cursor: null }, isFetching: false, isError: false, refetch: vi.fn() }
  return {
    useDecideApplicationMutation: () => [vi.fn(), { isLoading: false }],
    useListApplicationFormsQuery: (args: unknown, options: unknown) => {
      mocks.formsArgs(args, options)
      return query
    },
    useListApplicationsQuery: (args: unknown, options: unknown) => {
      mocks.applicationsArgs(args, options)
      return query
    },
  }
})

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <PmApplicationsPage />
    </MemoryRouter>,
  )

describe('PmApplicationsPage tab and form filter', () => {
  beforeEach(() => {
    mocks.applicationsArgs.mockReset()
    mocks.formsArgs.mockReset()
  })

  it('opens the inbox of one form from the Forms tab link', () => {
    renderAt('/pm/applications?tab=inbox&form_id=7')
    expect(screen.getByText('tab:inbox')).toBeInTheDocument()
    expect(screen.getByText('form:7')).toBeInTheDocument()
    expect(mocks.applicationsArgs).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner_id: 20, form_id: 7, limit: 50 }),
      { skip: false },
    )
    // The forms list is not read while the inbox is open.
    expect(mocks.formsArgs).toHaveBeenLastCalledWith(expect.anything(), { skip: true })
  })

  it('starts on the Forms tab with no form filter', () => {
    renderAt('/pm/applications')
    expect(screen.getByText('tab:forms')).toBeInTheDocument()
    expect(mocks.applicationsArgs).toHaveBeenLastCalledWith(expect.objectContaining({ form_id: undefined }), { skip: true })
  })

  it('ignores a form_id that is not a number', () => {
    renderAt('/pm/applications?tab=inbox&form_id=abc')
    expect(screen.getByText('form:null')).toBeInTheDocument()
  })

  it('clears the form filter and stays on the inbox', () => {
    renderAt('/pm/applications?tab=inbox&form_id=7')
    fireEvent.click(screen.getByRole('button', { name: 'Clear form filter' }))
    expect(screen.getByText('tab:inbox')).toBeInTheDocument()
    expect(screen.getByText('form:null')).toBeInTheDocument()
  })
})
