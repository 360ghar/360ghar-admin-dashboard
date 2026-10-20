import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import UserProfilePage from '../UserProfilePage'

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  toast: vi.fn(),
  profile: {
    id: 1,
    supabase_user_id: 'account-a',
    full_name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+919800000000',
    date_of_birth: '1990-05-01',
    is_active: true,
    is_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    privacy_settings: {},
    preferences: {},
  },
}))

vi.mock('@/features/users/api/usersApi', () => ({
  useGetProfileQuery: () => ({ data: mocks.profile, isLoading: false, error: undefined, refetch: vi.fn() }),
  useUpdateProfileMutation: () => [mocks.updateProfile, { isLoading: false }],
  useUpdatePreferencesMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateLocationMutation: () => [vi.fn(), { isLoading: false }],
  useUpdatePrivacySettingsMutation: () => [vi.fn()],
}))
vi.mock('@/features/agents/api/agentsApi', () => ({
  useGetAssignedAgentQuery: () => ({ data: undefined, error: undefined, refetch: vi.fn() }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/reactbits/FadeContent', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateProfile.mockImplementation(() => ({ unwrap: () => Promise.resolve(mocks.profile) }))
})

describe('UserProfilePage save', () => {
  it('sends a blank date of birth as null and never sends email or bio', async () => {
    render(<UserProfilePage />)
    const dob = await screen.findByLabelText('Date of Birth')
    await waitFor(() => expect(dob).toHaveValue('1990-05-01'))

    fireEvent.change(dob, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledOnce())
    expect(mocks.updateProfile).toHaveBeenCalledWith({ date_of_birth: null })
  })

  it('sends only the fields that changed', async () => {
    render(<UserProfilePage />)
    const name = await screen.findByLabelText('Full Name')
    await waitFor(() => expect(name).toHaveValue('Asha Rao'))

    fireEvent.change(name, { target: { value: 'Asha R' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledOnce())
    expect(mocks.updateProfile).toHaveBeenCalledWith({ full_name: 'Asha R' })
  })

  it('shows the email read-only and has no bio control', async () => {
    render(<UserProfilePage />)
    const email = await screen.findByLabelText('Email')
    expect(email).toBeDisabled()
    expect(email).toHaveValue('asha@example.com')
    expect(screen.queryByLabelText('Bio')).not.toBeInTheDocument()
  })

  it('does not call the API when nothing changed', async () => {
    render(<UserProfilePage />)
    const name = await screen.findByLabelText('Full Name')
    await waitFor(() => expect(name).toHaveValue('Asha Rao'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'No changes' })))
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })
})
