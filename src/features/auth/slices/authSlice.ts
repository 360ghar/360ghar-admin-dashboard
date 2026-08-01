import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store'
import type { User } from '@/types'
import { readJSON, removeStored, writeJSON } from '@/lib/storage'

interface AuthState {
  token: string | null
  user: User | null
  initialized: boolean
  error: string | null
}

const USER_STORAGE_KEY = 'user'

const isStoredUser = (value: unknown): value is User => {
  if (typeof value !== 'object' || value === null) return false
  return Boolean((value as Record<string, unknown>).id)
}

export function loadUserFromStorage(): User | null {
  return readJSON<User | null>(USER_STORAGE_KEY, null, isStoredUser)
}

const initialState: AuthState = {
  token: null,
  user: loadUserFromStorage(),
  initialized: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token?: string | null; user: User }>) => {
      if (action.payload.token !== undefined) {
        state.token = action.payload.token
      }
      state.user = action.payload.user
      writeJSON(USER_STORAGE_KEY, action.payload.user)
    },
    clearCredentials: (state) => {
      state.token = null
      state.user = null
      removeStored(USER_STORAGE_KEY)
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { setCredentials, clearCredentials, setInitialized, setError } = authSlice.actions

export const selectIsAuthenticated = (state: RootState) => !!state.auth.token && !!state.auth.user
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthError = (state: RootState) => state.auth.error
export const selectAuthInitialized = (state: RootState) => state.auth.initialized

export default authSlice.reducer
