import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import AgentList from '../AgentList'

const mocks = vi.hoisted(() => ({
  next: vi.fn(),
  prev: vi.fn(),
  refetch: vi.fn(),
  listAgents: vi.fn(),
  // Stable references: a new array on every render would change the memo inputs each time.
  activeAgents: [
    { id: 1, name: 'On this page', is_active: true },
    { id: 2, name: 'Off this page', is_active: true },
  ],
  workload: [
    { agent_id: 1, utilization_percentage: 60, current_users: 30 },
    { agent_id: 2, utilization_percentage: 10, current_users: 5 },
  ],
}))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ user: { supabase_user_id: 'admin-1' }, role: 'admin' }),
}))
vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useFilterPersistence', () => ({
  useFilterPersistence: () => ({
    filters: { q: '', status: 'inactive' },
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
  }),
}))
vi.mock('@/hooks/usePageSizePreference', () => ({
  PAGE_SIZE_OPTIONS: [10, 20, 50],
  usePageSizePreference: () => [20, vi.fn()],
}))
vi.mock('@/hooks/useCursorPagination', () => ({
  useCursorPagination: () => ({ cursor: null, canPrev: false, next: mocks.next, prev: mocks.prev }),
}))
vi.mock('@/features/agents/api/agentsApi', () => ({
  useListAgentsQuery: mocks.listAgents,
  useListAllAgentsQuery: () => ({ data: mocks.activeAgents, isFetching: false, error: undefined }),
}))
vi.mock('@/features/core/api/systemApi', () => ({
  useGetWorkloadQuery: () => ({ data: mocks.workload, isFetching: false, error: undefined, refetch: vi.fn() }),
}))
vi.mock('../AgentListFilters', () => ({ AgentListFilters: () => null }))
vi.mock('../AgentAutoAssignDialog', () => ({
  AgentAutoAssignDialog: ({ target }: { target: { name: string } | null }) => <p>Auto-assign target: {target?.name ?? 'none'}</p>,
}))
vi.mock('../AgentTable', () => ({ AgentTable: () => null }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listAgents.mockReturnValue({
    currentData: {
      items: [{ id: 1, name: 'Active agent', is_active: true }],
      has_more: true,
      next_cursor: 'page-2',
    },
    isFetching: false,
    isLoading: false,
    error: undefined,
    refetch: mocks.refetch,
  })
})

it('can reach later pages when the inactive filter has no matches on this page', () => {
  render(<MemoryRouter><AgentList /></MemoryRouter>)

  expect(screen.getByText('No agents match your filters')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(mocks.next).toHaveBeenCalledWith('page-2')
})

it('shows a retry action for a failed refresh on an empty filtered page', () => {
  mocks.listAgents.mockReturnValue({
    currentData: {
      items: [{ id: 1, name: 'Active agent', is_active: true }],
      has_more: true,
      next_cursor: 'page-2',
    },
    isFetching: false,
    isLoading: false,
    error: { status: 503 },
    refetch: mocks.refetch,
  })

  render(<MemoryRouter><AgentList /></MemoryRouter>)

  expect(screen.getByRole('alert')).toHaveTextContent('Refresh failed')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(mocks.refetch).toHaveBeenCalledOnce()
})

it('auto-assigns to the least loaded of all active agents, not of the rows on this page', () => {
  render(<MemoryRouter><AgentList /></MemoryRouter>)

  // Only agent 1 is on this page, but agent 2 (on another page) carries less load.
  expect(screen.getByText('Auto-assign target: Off this page')).toBeInTheDocument()
})
