import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { store } from '@/store'
import { clearCredentials, setCredentials } from '@/features/auth/slices/authSlice'
import { setSelectedOwner } from '@/features/pm/slices/pmSlice'
import { scopedStorageKey, writeVersionedJSON } from '@/lib/storage'
import type { SelfUser } from '@/types'

const staff: SelfUser = {
  id: 1,
  supabase_user_id: 'account-a',
  full_name: 'Staff',
  email: 'staff@example.com',
  role: 'admin',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const key = scopedStorageKey('pm_selected_owner', 'account-a')

describe('selected owner in local storage', () => {
  beforeEach(() => {
    localStorage.clear()
    store.dispatch(clearCredentials())
  })

  afterEach(() => {
    store.dispatch(clearCredentials())
  })

  it('drops a record written by an older build, whose label could be a phone number', () => {
    writeVersionedJSON(key, 1, { id: 5, label: '+91 98765 43210' })
    store.dispatch(setCredentials({ token: 'token-a', user: staff }))
    expect(store.getState().pm.selected_owner).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('saves and restores the label as a name or Owner #id', () => {
    store.dispatch(setCredentials({ token: 'token-a', user: staff }))
    store.dispatch(setSelectedOwner({ id: 5, label: 'Owner #5' }))
    expect(localStorage.getItem(key)).toContain('"version":2')
    expect(localStorage.getItem(key)).not.toContain('+91')

    // Another account signs in, then this one returns: its own saved selection comes back.
    store.dispatch(setCredentials({ token: 'token-b', user: { ...staff, id: 2, supabase_user_id: 'account-b' } }))
    expect(store.getState().pm.selected_owner).toBeNull()
    store.dispatch(setCredentials({ token: 'token-a2', user: staff }))
    expect(store.getState().pm.selected_owner).toEqual({ id: 5, label: 'Owner #5' })
  })
})
