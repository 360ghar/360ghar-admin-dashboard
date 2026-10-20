import { configureStore, type Middleware } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import authReducer, {
  clearCredentials,
  profileStorageKey,
  setCredentials,
  setPendingSession,
} from '@/features/auth/slices/authSlice'
import pmReducer, { isSelectedOwner, setSelectedOwner } from '@/features/pm/slices/pmSlice'
import { readVersionedJSON, removeAccountFilters, removeStored, scopedStorageKey, writeVersionedJSON } from '@/lib/storage'
import { api } from './api'
// Import endpoint modules for side effects so they inject into `api`
import '@/features/users/api/usersApi'
import '@/features/agents/api/agentsApi'
import '@/features/properties/api/propertiesApi'
import '@/features/visits/api/visitsApi'
import '@/features/bookings/api/bookingsApi'
import '@/features/core/api/amenitiesApi'
import '@/features/core/api/notificationsApi'
import '@/features/core/api/systemApi'
import '@/features/blog/api/blogsApi'
import '@/features/pm/api/pmApi'
import '@/features/core/api/coreApi'
import '@/features/core/api/uploadApi'
import '@/features/swipes/api/swipesApi'
import '@/features/flatmates/api/flatmatesApi'
// Reviews module removed

const ownerStorageKey = (accountId: string) => scopedStorageKey('pm_selected_owner', accountId)
// Version 2: the saved owner label holds a name or `Owner #id`, never a phone or email. A version 1 record
// (whose label could be a contact fallback) fails the version check and is removed on read.
const OWNER_STORAGE_VERSION = 2

// Old builds stored the full backend profile under a global key. It has no
// account binding or expiry and must never be read by this version.
removeStored('user')
removeStored('pm_selected_owner')
removeStored('notifications_local')

/** Persist only allowlisted user preferences and clear server state at session boundaries. */
const sessionMiddleware: Middleware = (middlewareApi) => (next) => (action) => {
  const previous = (middlewareApi.getState() as RootState).auth
  const result = next(action)
  const current = (middlewareApi.getState() as RootState).auth

  if (clearCredentials.match(action)) {
    if (!previous.token && !previous.accountId && !previous.user) return result
    if (previous.accountId) {
      removeStored(profileStorageKey(previous.accountId))
      removeStored(ownerStorageKey(previous.accountId))
      removeAccountFilters(previous.accountId)
    }
    middlewareApi.dispatch(api.util.resetApiState())
    return result
  }

  if (setCredentials.match(action) || setPendingSession.match(action)) {
    const accountChanged = previous.accountId !== current.accountId
    const permissionChanged = previous.user && current.user &&
      (previous.user.role !== current.user.role || previous.user.agent_id !== current.user.agent_id)
    if (accountChanged || permissionChanged) {
      middlewareApi.dispatch(api.util.resetApiState())
      // Restore only a selection saved for this exact account. The backend
      // still checks owner access on every request.
      const selectedOwner = current.accountId && !permissionChanged
        ? readVersionedJSON(ownerStorageKey(current.accountId), OWNER_STORAGE_VERSION, isSelectedOwner)
        : null
      middlewareApi.dispatch(setSelectedOwner(selectedOwner))
    }
    if (setCredentials.match(action) && current.accountId && current.user) {
      // Never persist roles, permissions, contact data, or the API cache.
      writeVersionedJSON(profileStorageKey(current.accountId), 1, {
        id: current.user.id,
        supabase_user_id: current.accountId,
        full_name: current.user.full_name ?? null,
      }, 24 * 60 * 60 * 1000)
    }
  }

  if (setSelectedOwner.match(action) && current.accountId && current.profileStatus === 'verified') {
    const key = ownerStorageKey(current.accountId)
    if (action.payload) writeVersionedJSON(key, OWNER_STORAGE_VERSION, action.payload)
    else removeStored(key)
  }
  return result
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pm: pmReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sessionMiddleware, api.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
