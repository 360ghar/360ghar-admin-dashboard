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
  // Resolve the global `fetch` at call time (instead of module-eval time, RTK's
  // default) so tests can `vi.stubGlobal('fetch', ...)` and integration tests
  // can swap in a mock network. No behaviour change in production.
  fetchFn: (...args) => fetch(...args),
  prepareHeaders: async (headers, { getState }) => {
    // Fast path: the Redux token is kept fresh by App.tsx on TOKEN_REFRESHED,
    // so most requests never touch Supabase. Only consult Supabase when Redux
    // has no token yet (e.g. between page load and INITIAL_SESSION landing).
    let token = (getState() as { auth: AuthState }).auth.token
    if (!token && supabase) {
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token ?? null
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
  let result: Awaited<ReturnType<typeof rawBaseQuery>>
  try {
    result = await rawBaseQuery(args, api, extraOptions)
  } catch (err) {
    // Convert unexpected throws into an error result instead of propagating:
    // the `retry` wrapper would otherwise loop forever (it only consults
    // `retryCondition` for HandledErrors, not thrown exceptions).
    return {
      error: {
        status: 'FETCH_ERROR',
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }
  // Signal retry to stop on 401/403 by using retry.fail()
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    retry.fail(result.error)
  }
  return result
}

/**
 * Retry policy (idempotent GETs only):
 * - Never retry mutations (POST/PUT/PATCH/DELETE) — they may not be
 *   idempotent, and retrying a timed-out payment/create/cancel request risks
 *   double-submission on the backend.
 * - Never retry 4xx — the backend's answer is authoritative; retrying only
 *   wastes round-trips.
 * - Retry GETs on network errors / 5xx up to 3 attempts.
 * - Per-endpoint opt-out remains available via `extraOptions: { retry: false }`.
 *
 * Note: RTK's types make `maxRetries` and `retryCondition` mutually exclusive;
 * the attempt cap is therefore enforced inside the condition.
 */
interface RetryDecision {
  error: unknown
  args: unknown
  attempt: number
  extraOptions: unknown
}

/**
 * Decide whether a failed request should be retried. Kept as a standalone,
 * fully-`unknown`-typed function because RTK's `retryCondition` callback
 * parameters resolve to `any` under type-aware linting.
 */
function shouldRetryRequest({ error, args, attempt, extraOptions }: RetryDecision): boolean {
  // Per-endpoint opt-out: extraOptions: { retry: false }.
  if ((extraOptions as { retry?: boolean } | undefined)?.retry === false) return false
  // Never retry mutations — they may not be idempotent.
  const method =
    typeof args === 'object' && args !== null
      ? ((args as { method?: unknown }).method ?? 'GET')
      : 'GET'
  if (String(method).toUpperCase() !== 'GET') return false
  // Never retry 4xx — the backend's answer is authoritative.
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number' && status >= 400 && status < 500) return false
  }
  return attempt <= 3
}

const baseQueryWithRetries = retry(baseQueryNoRetryOnAuth, {
  retryCondition: (error, args, { attempt, extraOptions }) =>
    shouldRetryRequest({ error, args, attempt, extraOptions }),
})

/**
 * fetchBaseQuery serializes `null` as the string "null" (e.g. `?cursor=null`),
 * which backends reject as INVALID_CURSOR. Drop null/undefined (and empty
 * cursor strings) so page-1 requests omit the param entirely.
 */
export function sanitizeFetchArgs(args: string | FetchArgs): string | FetchArgs {
  if (typeof args === 'string' || !args.params) return args
  // URLSearchParams inputs (e.g. the properties `toSearchParams` builder)
  // must pass through untouched: Object.entries() sees no own enumerable keys
  // on a URLSearchParams instance, so the plain-object path below would
  // silently strip every query param (breaking status/cursor/sort filters).
  if (args.params instanceof URLSearchParams) return args
  if (typeof args.params !== 'object' || Array.isArray(args.params)) return args
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
