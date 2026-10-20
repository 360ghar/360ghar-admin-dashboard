import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NotificationsPage from '../NotificationsPage'

const mocks = vi.hoisted(() => ({ broadcast: vi.fn(), segment: vi.fn(), toast: vi.fn() }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/core/api/notificationsApi', () => ({
  useSendMarketingBroadcastMutation: () => [mocks.broadcast, { isLoading: false }],
  useSendMarketingToSegmentMutation: () => [mocks.segment, { isLoading: false }],
}))
vi.mock('@/features/agents/api/agentsApi', () => ({
  useListAllAgentsQuery: () => ({ data: [], error: undefined, refetch: vi.fn() }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.broadcast.mockImplementation(() => ({ unwrap: () => Promise.resolve({ requested: 12, processed: 12, succeeded: 9 }) }))
})

describe('NotificationsPage composer', () => {
  it('offers broadcast and segment only: the topic channel is gone', () => {
    render(<NotificationsPage />)
    expect(screen.getByRole('tab', { name: /Broadcast/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Segment/ })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Topic/ })).not.toBeInTheDocument()
  })

  it('sends the route as deep_link with a registered type key and reports delivered users', async () => {
    render(<NotificationsPage />)
    fireEvent.change(screen.getByPlaceholderText('Notification title'), { target: { value: 'New listings' } })
    fireEvent.change(screen.getByPlaceholderText('Write the message users will see…'), { target: { value: 'Fresh homes are live.' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. /property/123'), { target: { value: '/property/123' } })
    fireEvent.click(screen.getByRole('button', { name: /Send broadcast/i }))

    await waitFor(() => expect(mocks.broadcast).toHaveBeenCalledOnce())
    expect(mocks.broadcast).toHaveBeenCalledWith({
      typeKey: 'promotion_generic',
      title: 'New listings',
      body: 'Fresh homes are live.',
      deep_link: '/property/123',
    })
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Broadcast sent',
      description: 'Sent to 12 of 12 users. 9 dispatched without error.',
    })))
  })

  it('rejects a route that is neither an app route nor an https link', async () => {
    render(<NotificationsPage />)
    fireEvent.change(screen.getByPlaceholderText('Notification title'), { target: { value: 'T' } })
    fireEvent.change(screen.getByPlaceholderText('Write the message users will see…'), { target: { value: 'B' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. /property/123'), { target: { value: 'ghar360://properties/123' } })
    fireEvent.click(screen.getByRole('button', { name: /Send broadcast/i }))
    await screen.findByText('Use an app route such as /property/123 or an https link')
    expect(mocks.broadcast).not.toHaveBeenCalled()
  })
})
