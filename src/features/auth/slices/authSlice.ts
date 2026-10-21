import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store'
import type { SelfUser } from '@/types'
import { isRecord, readVersionedJSON, removeStored, scopedStorageKey } from '@/lib/storage'

export interface CachedProfile {
  id: number
  supabase_user_id: string
  /** The backend allows a null name (an account that never set one). */
  full_name: string | null
}

interface AuthState {
  token: string | null
  accountId: string | null
  user: SelfUser | null
  cachedProfile: CachedProfile | null
  profileStatus: 'none' | 'pending' | 'verified'
  verifying: boolean
  sessionVersion: number
  initialized: boolean
  error: string | null
}

export const profileStorageKey = (accountId: string) => scopedStorageKey('profile', accountId)

export function isCachedProfile(value: unknown): value is CachedProfile {
  if (!isRecord(value)) return false
  return typeof value.id === 'number' && Number.isInteger(value.id) && value.id > 0 &&
    typeof value.supabase_user_id === 'string' && value.supabase_user_id.length > 0 &&
    (value.full_name === null || (typeof value.full_name === 'string' && value.full_name.length <= 200))
}

/** A cached identity hint is never a source of role or permission data. */
export function loadCachedProfile(accountId: string): CachedProfile | null {
  const key = profileStorageKey(accountId)
  const profile = readVersionedJSON(key, 1, isCachedProfile)
  if (profile && profile.supabase_user_id !== accountId) {
    removeStored(key)
    return null
  }
  return profile
}

const initialState: AuthState = {
  token: null,
  accountId: null,
  user: null,
  cachedProfile: null,
  profileStatus: 'none',
  verifying: false,
  sessionVersion: 0,
  initialized: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token?: string | null; user: SelfUser }>) => {
      const accountId = action.payload.user.supabase_user_id
      // A role or agent change moves the permission scope: late responses of the old scope must be rejected too.
      const permissionChanged = state.user != null &&
        (state.user.role !== action.payload.user.role || state.user.agent_id !== action.payload.user.agent_id)
      if (state.accountId !== accountId || permissionChanged) state.sessionVersion += 1
      state.accountId = accountId
      if (action.payload.token !== undefined) state.token = action.payload.token
      state.user = action.payload.user
      state.cachedProfile = null
      state.profileStatus = 'verified'
      state.verifying = false
    },
    setPendingSession: (state, action: PayloadAction<{
      token: string
      accountId: string
      cachedProfile?: CachedProfile | null
      verifying?: boolean
    }>) => {
      if (state.accountId !== action.payload.accountId) state.sessionVersion += 1
      state.token = action.payload.token
      state.accountId = action.payload.accountId
      state.user = null
      state.cachedProfile = action.payload.cachedProfile ?? null
      state.profileStatus = 'pending'
      state.verifying = action.payload.verifying ?? true
    },
    /** Swap in a refreshed access token for the signed-in account. Ignored for any other account. */
    setAccessToken: (state, action: PayloadAction<{ token: string; accountId: string }>) => {
      if (state.accountId === action.payload.accountId) state.token = action.payload.token
    },
    clearCredentials: (state) => {
      if (state.token || state.accountId || state.user) state.sessionVersion += 1
      state.token = null
      state.accountId = null
      state.user = null
      state.cachedProfile = null
      state.profileStatus = 'none'
      state.verifying = false
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setCredentials, setPendingSession, setAccessToken, clearCredentials, setInitialized, setError } = authSlice.actions

export const selectIsAuthenticated = (state: RootState) => state.auth.profileStatus === 'verified' && !!state.auth.token && !!state.auth.user
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthError = (state: RootState) => state.auth.error
export const selectAuthInitialized = (state: RootState) => state.auth.initialized

export default authSlice.reducer
