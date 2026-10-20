import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { store } from '@/store'
import { api } from '@/store/api'
import { clearCredentials, profileStorageKey, setCredentials } from '@/features/auth/slices/authSlice'
import { setSelectedOwner } from '@/features/pm/slices/pmSlice'
import { scopedStorageKey } from '@/lib/storage'
import { propertiesApi } from '@/features/properties/api/propertiesApi'
import type { SelfUser } from '@/types'

const user = (accountId: string, id: number): SelfUser => ({
  id,
  supabase_user_id: accountId,
  full_name: `Staff ${id}`,
  email: `staff${id}@example.com`,
  role: 'admin',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

describe('session boundaries', () => {
  beforeEach(() => {
    localStorage.clear()
    store.dispatch(clearCredentials())
  })

  afterEach(() => {
    store.dispatch(clearCredentials())
    vi.unstubAllGlobals()
  })

  it('stores only an allowlisted profile hint and scopes owner selection', () => {
    store.dispatch(setCredentials({ token: 'token-a', user: user('account-a', 1) }))
    store.dispatch(setSelectedOwner({ id: 5, label: 'Owner 5' }))

    const storedProfile = localStorage.getItem(profileStorageKey('account-a')) ?? ''
    expect(storedProfile).toContain('Staff 1')
    expect(storedProfile).not.toContain('staff1@example.com')
    expect(storedProfile).not.toContain('token-a')
    expect(storedProfile).not.toContain('admin')

    store.dispatch(setCredentials({ token: 'token-b', user: user('account-b', 2) }))
    expect(store.getState().pm.selected_owner).toBeNull()
    expect(localStorage.getItem(scopedStorageKey('pm_selected_owner', 'account-a'))).not.toBeNull()

    store.dispatch(setCredentials({ token: 'token-a2', user: user('account-a', 1) }))
    expect(store.getState().pm.selected_owner).toEqual({ id: 5, label: 'Owner 5' })

    store.dispatch(clearCredentials())
    expect(store.getState().pm.selected_owner).toBeNull()
    expect(localStorage.getItem(profileStorageKey('account-a'))).toBeNull()
    expect(localStorage.getItem(scopedStorageKey('pm_selected_owner', 'account-a'))).toBeNull()
  })

  it('removes saved list filters on sign-out: a search can hold a customer phone or email', () => {
    store.dispatch(setCredentials({ token: 'token-a', user: user('account-a', 1) }))
    const filters = scopedStorageKey('filters_users', 'account-a')
    const otherAccount = scopedStorageKey('filters_users', 'account-b')
    localStorage.setItem(filters, JSON.stringify({ q: 'asha@example.com' }))
    localStorage.setItem(otherAccount, JSON.stringify({ q: 'kept' }))

    store.dispatch(clearCredentials())

    expect(localStorage.getItem(filters)).toBeNull()
    expect(localStorage.getItem(otherAccount)).not.toBeNull()
  })

  it('does not place an old account response in the new account cache', async () => {
    let respond: ((value: Response) => void) | undefined
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { respond = resolve }))
    vi.stubGlobal('fetch', fetchMock)

    store.dispatch(setCredentials({ token: 'token-a', user: user('account-a', 1) }))
    const request = store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ limit: 1 }))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

    store.dispatch(setCredentials({ token: 'token-b', user: user('account-b', 2) }))
    respond?.(new Response(JSON.stringify({ items: [{ id: 99 }], next_cursor: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    await request

    expect(Object.values(store.getState()[api.reducerPath].queries).every((entry) => !entry?.data)).toBe(true)
    expect(store.getState().auth.accountId).toBe('account-b')
  })

  it('does not sign out the new account for a late 401 from the old account', async () => {
    let respond: ((value: Response) => void) | undefined
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { respond = resolve }))
    vi.stubGlobal('fetch', fetchMock)

    store.dispatch(setCredentials({ token: 'token-a', user: user('account-a', 1) }))
    const request = store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ limit: 2 }))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    store.dispatch(setCredentials({ token: 'token-b', user: user('account-b', 2) }))

    respond?.(new Response(JSON.stringify({ detail: 'expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }))
    await request
    expect(store.getState().auth.accountId).toBe('account-b')
    expect(store.getState().auth.token).toBe('token-b')
  })
})
