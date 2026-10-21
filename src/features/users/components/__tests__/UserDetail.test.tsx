import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import UserDetail from '../UserDetail'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  send: vi.fn(),
  toast: vi.fn(),
  role: 'admin' as 'admin' | 'agent',
  user: {
    id: 8,
    full_name: 'Ravi',
    phone: '+919811111111',
    email: 'ravi@example.com',
    is_active: true,
    agent_id: 3,
    agent: { id: 3, name: 'Meera', contact_number: null },
  },
}))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/users/api/usersApi', () => ({
  useGetUserQuery: () => ({ data: mocks.user, isLoading: false, isFetching: false, error: undefined, refetch: vi.fn() }),
  useUpdateUserMutation: () => [mocks.update, { isLoading: false }],
  useSendTypedNotificationMutation: () => [mocks.send, { isLoading: false }],
}))
vi.mock('@/features/core/api/notificationsApi', () => ({
  useGetUserNotificationsQuery: () => ({
    data: { items: [{ id: 'd1', type: 'booking_confirmed', title: 'Booked', body: 'Done', read_at: null, created_at: '2026-10-01T00:00:00Z' }] },
    isLoading: false, isError: false, error: undefined, refetch: vi.fn(),
  }),
}))
vi.mock('../assign/AssignAgent', () => ({ default: () => null }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: mocks.role, user: { id: 1 } }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: ({ actions }: { actions?: React.ReactNode }) => <div>{actions}</div> }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.role = 'admin'
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve(mocks.user) }))
})

describe('UserDetail admin save', () => {
  it('has no email control and sends only the changed fields', async () => {
    render(<UserDetail id={8} />)
    const name = await screen.findByDisplayValue('Ravi')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

    fireEvent.change(name, { target: { value: 'Ravi K' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    expect(mocks.update).toHaveBeenCalledWith({ id: 8, data: { full_name: 'Ravi K' } })
  })

  it('offers the Status control to an admin only', async () => {
    const view = render(<UserDetail id={8} />)
    await screen.findByDisplayValue('Ravi')
    expect(screen.getByText('Status')).toBeInTheDocument()
    view.unmount()

    // An agent that sends is_active gets 403 ADMIN_REQUIRED, so the control is not shown.
    mocks.role = 'agent'
    render(<UserDetail id={8} />)
    await screen.findByDisplayValue('Ravi')
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
  })

  it('reads the agent from the user summary and the history from the inbox row shape', async () => {
    render(<UserDetail id={8} />)
    await screen.findByDisplayValue('Ravi')
    expect(screen.getByText('Agent: Meera')).toBeInTheDocument()
    expect(screen.getByText(/Booking confirmed • unread/)).toBeInTheDocument()
  })

  it('reports a notification that no channel delivered instead of claiming success', async () => {
    mocks.send.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ type_key: 'promotion_generic', title: 't', body: 'b', sent_at: 'x', channels: { push: { ok: false, sent: 0, error: 'FCM_REJECTED' } } }),
    }))
    render(<UserDetail id={8} />)
    await screen.findByDisplayValue('Ravi')
    fireEvent.change(screen.getByPlaceholderText('Write the message to send to this user…'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send notification' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Not delivered', description: 'push: FCM_REJECTED' })))
  })
})
