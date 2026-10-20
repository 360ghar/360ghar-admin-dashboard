import { configureStore } from '@reduxjs/toolkit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import authReducer, { setCredentials } from '@/features/auth/slices/authSlice'
import { api } from '@/store/api'
import { agentsApi } from '@/features/agents/api/agentsApi'
import type { SelfUser } from '@/types'

const auth = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { refreshSession: auth.refreshSession, getSession: auth.getSession, signOut: auth.signOut } },
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))

const user: SelfUser = {
  id: 1,
  supabase_user_id: 'account-a',
  role: 'admin',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
}

function makeStore() {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  })
  store.dispatch(setCredentials({ token: 'token-1', user }))
  return store
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json' },
})
const bearer = (call: unknown[]) => (call[0] as Request).headers.get('Authorization')

describe('401 refresh and retry in the base query', () => {
  beforeEach(() => {
    auth.refreshSession.mockReset()
    auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
    auth.signOut.mockReset().mockResolvedValue({})
  })
  afterEach(() => vi.unstubAllGlobals())

  it('refreshes the token once and retries the request with it', async () => {
    const fetchMock = vi.fn((request: Request) =>
      Promise.resolve(request.headers.get('Authorization') === 'Bearer token-2' ? json({ id: 3 }) : json({ error: { code: 'TOKEN_EXPIRED', message: 'expired' } }, 401)))
    vi.stubGlobal('fetch', fetchMock)
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'token-2', user: { id: 'account-a' } } }, error: null })
    const store = makeStore()

    const result = await store.dispatch(agentsApi.endpoints.getAgent.initiate(3)).unwrap()

    expect(result).toMatchObject({ id: 3 })
    expect(auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.map(bearer)).toEqual(['Bearer token-1', 'Bearer token-2'])
    expect(store.getState().auth.token).toBe('token-2')
    expect(store.getState().auth.accountId).toBe('account-a')
  })

  it('signs out only when the retried request is also a 401', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ error: { code: 'TOKEN_INVALID', message: 'no' } }, 401)))
    vi.stubGlobal('fetch', fetchMock)
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'token-2', user: { id: 'account-a' } } }, error: null })
    const store = makeStore()

    await expect(store.dispatch(agentsApi.endpoints.getAgent.initiate(3)).unwrap()).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(store.getState().auth.token).toBeNull()
    expect(store.getState().auth.accountId).toBeNull()
  })

  it('signs out without a retry when no session can be refreshed', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ error: { code: 'TOKEN_INVALID', message: 'no' } }, 401)))
    vi.stubGlobal('fetch', fetchMock)
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'refresh token expired' } })
    const store = makeStore()

    await expect(store.dispatch(agentsApi.endpoints.getAgent.initiate(3)).unwrap()).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.getState().auth.token).toBeNull()
  })

  it('retries with the current token when it rotated while the request was in flight', async () => {
    let release: ((value: Response) => void) | undefined
    const fetchMock = vi.fn((request: Request) => {
      if (request.headers.get('Authorization') === 'Bearer token-1') {
        return new Promise<Response>((resolve) => { release = resolve })
      }
      return Promise.resolve(json({ id: 3 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()

    const pending = store.dispatch(agentsApi.endpoints.getAgent.initiate(3))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    // The app swaps in a refreshed token (same account) while the first request is still open.
    store.dispatch(setCredentials({ token: 'token-2', user }))
    release?.(json({ error: { code: 'TOKEN_EXPIRED', message: 'expired' } }, 401))

    await expect(pending.unwrap()).resolves.toMatchObject({ id: 3 })
    expect(auth.refreshSession).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls.map(bearer)).toEqual(['Bearer token-1', 'Bearer token-2'])
    expect(store.getState().auth.token).toBe('token-2')
  })

  it('shares one refresh between concurrent 401 responses', async () => {
    const fetchMock = vi.fn((request: Request) =>
      Promise.resolve(request.headers.get('Authorization') === 'Bearer token-2' ? json({ id: 1 }) : json({ error: { code: 'TOKEN_EXPIRED', message: 'expired' } }, 401)))
    vi.stubGlobal('fetch', fetchMock)
    let resolveRefresh: ((value: unknown) => void) | undefined
    auth.refreshSession.mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve }))
    const store = makeStore()

    const first = store.dispatch(agentsApi.endpoints.getAgent.initiate(1))
    const second = store.dispatch(agentsApi.endpoints.getAgent.initiate(2))
    await vi.waitFor(() => expect(auth.refreshSession).toHaveBeenCalled())
    resolveRefresh?.({ data: { session: { access_token: 'token-2', user: { id: 'account-a' } } }, error: null })

    await first.unwrap()
    await second.unwrap()
    expect(auth.refreshSession).toHaveBeenCalledTimes(1)
  })
})
