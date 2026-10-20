import { act, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { SelfUser } from '@/types'
import { clearCredentials, setCredentials } from '@/features/auth/slices/authSlice'
import { isLoginInProgress } from '@/lib/loginState'
import { store } from '@/store'
import App from '@/App'

const auth = vi.hoisted(() => ({
  listener: null as ((event: AuthChangeEvent, session: Session | null) => void) | null,
  fetchProfile: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: typeof auth.listener) => {
        auth.listener = listener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      getSession: auth.getSession,
      signOut: auth.signOut,
    },
  },
}))
vi.mock('@/lib/auth', () => ({ fetchUserProfileWithStatus: auth.fetchProfile }))
vi.mock('@/features/auth/pages/LoginPage', () => ({ default: () => 'Login' }))

const session = { user: { id: 'account-a' }, access_token: 'token-a' } as Session
const user: SelfUser = {
  id: 1,
  supabase_user_id: 'account-a',
  full_name: 'Staff A',
  email: 'staff@example.com',
  role: 'admin',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function mountApp() {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}

function emit(event: AuthChangeEvent, currentSession = session) {
  if (!auth.listener) throw new Error('Auth listener was not registered')
  auth.listener(event, currentSession)
}

describe('App session verification', () => {
  beforeEach(() => {
    auth.listener = null
    auth.fetchProfile.mockReset()
    auth.getSession.mockReset().mockResolvedValue({ data: { session }, error: null })
    auth.signOut.mockReset().mockResolvedValue({ error: null })
    isLoginInProgress.current = false
    store.dispatch(clearCredentials())
  })

  afterEach(() => {
    store.dispatch(clearCredentials())
    isLoginInProgress.current = false
  })

  it('applies a denial when SIGNED_IN repeats during a verified recheck', async () => {
    store.dispatch(setCredentials({ token: session.access_token, user }))
    let completeProfile: ((value: { user: null; status: number }) => void) | undefined
    auth.fetchProfile.mockImplementation(() => new Promise((resolve) => { completeProfile = resolve }))
    const view = mountApp()

    act(() => {
      emit('SIGNED_IN')
      emit('SIGNED_IN')
    })
    expect(auth.fetchProfile).toHaveBeenCalledTimes(1)

    await act(() => {
      completeProfile?.({ user: null, status: 403 })
      return Promise.resolve()
    })
    await waitFor(() => expect(store.getState().auth.profileStatus).toBe('none'))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('shares a pending verification across focus and online retries', async () => {
    let completeProfile: ((value: { user: SelfUser; status: number }) => void) | undefined
    auth.fetchProfile.mockImplementation(() => new Promise((resolve) => { completeProfile = resolve }))
    const view = mountApp()

    await act(() => {
      emit('INITIAL_SESSION')
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('online'))
      return Promise.resolve()
    })
    expect(auth.fetchProfile).toHaveBeenCalledTimes(1)

    await act(() => {
      completeProfile?.({ user, status: 200 })
      return Promise.resolve()
    })
    await waitFor(() => expect(store.getState().auth.profileStatus).toBe('verified'))
    view.unmount()
  })

  it('uses a new token from SIGNED_IN while the same account is pending', async () => {
    const refreshedSession = { ...session, access_token: 'token-b' }
    let completeOldProfile: ((value: { user: null; status: number }) => void) | undefined
    auth.fetchProfile.mockImplementation((token: string) => token === session.access_token
      ? new Promise<{ user: null; status: number }>((resolve) => { completeOldProfile = resolve })
      : Promise.resolve({ user, status: 200 }))
    const view = mountApp()

    await act(() => {
      emit('INITIAL_SESSION')
      emit('SIGNED_IN', refreshedSession)
      return Promise.resolve()
    })
    expect(auth.fetchProfile).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(store.getState().auth.profileStatus).toBe('verified'))
    expect(store.getState().auth.token).toBe('token-b')

    await act(() => {
      completeOldProfile?.({ user: null, status: 403 })
      return Promise.resolve()
    })
    expect(store.getState().auth.profileStatus).toBe('verified')
    expect(auth.signOut).not.toHaveBeenCalled()
    view.unmount()
  })
})
