import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import UserPreferencesPage from '../UserPreferencesPage'
import type { UserPreferencesPatch } from '@/types/api'

// One stable object: the page re-reads the profile in an effect, so a new object on every render would loop.
const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn<(body: UserPreferencesPatch) => { unwrap: () => Promise<unknown> }>(),
  toast: vi.fn(),
  profile: {
    preferences: { property_type: ['apartment'], purpose: 'rent', budget_min: 20000, budget_max: 50000, location_preference: ['Pune'] },
    notification_settings: { email_notifications: true, push_notifications: true, sms_notifications: false, promotional_emails: false },
    current_latitude: 18.5,
    current_longitude: 73.8,
  },
  refetch: vi.fn(),
}))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/users/api/usersApi', () => ({
  useGetProfileQuery: () => ({
    data: mocks.profile,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useUpdatePreferencesMutation: () => [mocks.updatePreferences, { isLoading: false }],
  useUpdateLocationMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateProfileMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updatePreferences.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
})

describe('UserPreferencesPage', () => {
  it('sends null for a cleared input: PUT /users/preferences keeps unsent keys and null removes one', async () => {
    render(<UserPreferencesPage />)
    fireEvent.change(screen.getByLabelText('Min Budget (₹)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Preferences/ }))

    await waitFor(() => expect(mocks.updatePreferences).toHaveBeenCalledOnce())
    const body = mocks.updatePreferences.mock.calls[0][0]
    expect(body.budget_min).toBeNull()
    expect(body.budget_max).toBe(50000)
    expect(body.purpose).toBe('rent')
    expect(body.property_type).toEqual(['apartment'])
    expect(body.bedrooms_min).toBeNull()
  })
})
