import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AgentAutoAssignDialog } from '../AgentAutoAssignDialog'

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  toast: vi.fn(),
  useGetUsersQuery: vi.fn(),
  assign: vi.fn(),
}))

vi.mock('@/features/users/api/usersApi', () => ({
  useGetUsersQuery: mocks.useGetUsersQuery,
  useAssignAgentMutation: () => [mocks.assign, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

const target = {
  id: 7,
  name: 'Priya Singh',
  agent_type: 'general' as const,
  experience_level: 'expert' as const,
  is_active: true,
  is_available: true,
  total_users_assigned: 2,
  user_satisfaction_rating: 4.7,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useGetUsersQuery.mockReturnValue({ currentData: undefined, isFetching: false, error: { status: 503 }, refetch: mocks.refetch })
})

it('shows a request error with retry instead of an empty user list', () => {
  render(<AgentAutoAssignDialog target={target} workloadByAgent={new Map([[7, { utilization: 40, currentUsers: 2 }]])} />)
  fireEvent.click(screen.getByRole('button', { name: 'Auto-Assign to Least Loaded' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Could not load unassigned users')
  expect(screen.queryByText('No unassigned active users found.')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(mocks.refetch).toHaveBeenCalledOnce()
})

it('shows loading before the first user result arrives', () => {
  mocks.useGetUsersQuery.mockReturnValue({ currentData: undefined, isFetching: true, error: undefined, refetch: mocks.refetch })
  render(<AgentAutoAssignDialog target={target} workloadByAgent={new Map()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Auto-Assign to Least Loaded' }))

  expect(screen.getByRole('status')).toHaveTextContent('Loading users')
  expect(screen.queryByText('No unassigned active users found.')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled()
})

it('searches unassigned users on the server instead of listing the first 100', async () => {
  mocks.useGetUsersQuery.mockReturnValue({ currentData: { items: [], has_more: false, next_cursor: null }, isFetching: false, error: undefined, refetch: mocks.refetch })
  render(<AgentAutoAssignDialog target={target} workloadByAgent={new Map()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Auto-Assign to Least Loaded' }))
  fireEvent.change(screen.getByLabelText('Search users'), { target: { value: ' Asha ' } })

  await waitFor(() => expect(mocks.useGetUsersQuery).toHaveBeenLastCalledWith(
    { limit: 100, unassigned: true, is_active: true, q: 'Asha' },
    { skip: false },
  ))
})
