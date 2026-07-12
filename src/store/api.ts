import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { retry } from '@reduxjs/toolkit/query'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { clearCredentials } from '@/features/auth/slices/authSlice'
import { supabase } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/config'
import { toast } from '@/hooks/use-toast'

interface AuthState {
  token: string | null
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    let token = (getState() as { auth: AuthState }).auth.token
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token ?? token
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// Wrap rawBaseQuery to bail out of retries on auth errors (401/403)
const baseQueryNoRetryOnAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  // Signal retry to stop on 401/403 by using retry.fail()
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    retry.fail(result.error)
  }
  return result
}

const baseQueryWithRetries = retry(baseQueryNoRetryOnAuth, { maxRetries: 3 })

/**
 * fetchBaseQuery serializes `null` as the string "null" (e.g. `?cursor=null`),
 * which backends reject as INVALID_CURSOR. Drop null/undefined (and empty
 * cursor strings) so page-1 requests omit the param entirely.
 */
function sanitizeFetchArgs(args: string | FetchArgs): string | FetchArgs {
  if (typeof args === 'string' || !args.params || typeof args.params !== 'object' || Array.isArray(args.params)) {
    return args
  }
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(args.params as Record<string, unknown>)) {
    if (value === null || value === undefined) continue
    if (key === 'cursor' && value === '') continue
    cleaned[key] = value
  }
  return { ...args, params: cleaned }
}

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await baseQueryWithRetries(sanitizeFetchArgs(args), api, extraOptions)
  if (result.error && result.error.status === 401) {
    // Only notify if the user actually had a session (an expired/revoked
    // token) — stay silent for anonymous requests that 401 by design. The
    // Redux token isn't refreshed on Supabase TOKEN_REFRESHED, so also consult
    // the live Supabase session before deciding.
    let hadSession = Boolean((api.getState() as { auth: AuthState }).auth.token)
    if (supabase) {
      if (!hadSession) {
        const { data } = await supabase.auth.getSession()
        hadSession = Boolean(data.session)
      }
      await supabase.auth.signOut()
    }
    api.dispatch(clearCredentials())
    if (hadSession) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      })
    }
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  refetchOnReconnect: true,
  tagTypes: [
    'Property',
    'User',
    'Visit',
    'Booking',
    'Agent',
    'Amenity',
    'BugReport',
    'Page',
    'AppUpdate',
    'Faq',
    'BlogPost',
    'BlogCategory',
    'BlogTag',
    'Swipe',
    'FlatmatesListing',
    'FlatmatesReport',
    // Property Management (PM)
    'PmDashboard',
    'PmProperty',
    'PmLease',
    'PmRentCharge',
    'PmRentPayment',
    'PmExpense',
    'PmMaintenanceRequest',
    'PmDocument',
    'PmInspection',
    'PmAssignment',
    'PmApplicationForm',
    'PmApplication',
    'PmTenant',
    'PmSettings',
    'Notification',
  ],
  endpoints: () => ({}),
})
