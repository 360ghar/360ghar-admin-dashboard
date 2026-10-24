import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { retry } from '@reduxjs/toolkit/query'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { clearCredentials, setAccessToken } from '@/features/auth/slices/authSlice'
import { supabase } from '@/lib/supabase'
import { MAX_PAGE_LIMIT } from '@/types/api'
import { API_BASE_URL } from '@/lib/config'
import { toast } from '@/hooks/use-toast'
import { requestStaffProfileRecheck } from '@/lib/sessionEvents'
import { parseRetryAfter } from '@/lib/retryAfter'

interface AuthState {
  token: string | null
  accountId: string | null
  sessionVersion: number
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15_000,
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

/** Longest wait taken from a Retry-After header. A longer ask shows as the error instead of freezing the screen. */
const MAX_RETRY_AFTER_MS = 10_000

function isGetRequest(args: string | FetchArgs): boolean {
  return typeof args === 'string' || !args.method || args.method.toUpperCase() === 'GET'
}

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
  // A 503 on a GET is retried below. Wait for the server's Retry-After first, so the retry never comes sooner.
  // 429 is a 4xx and is never retried, so it needs no wait.
  if (result.error?.status === 503 && isGetRequest(args)) {
    const waitMs = parseRetryAfter(result.meta?.response?.headers.get('Retry-After'))
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, MAX_RETRY_AFTER_MS)))
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
      ? ((args as { method?: string }).method ?? 'GET')
      : 'GET'
  if (String(method).toUpperCase() !== 'GET') return false
  // Never retry 4xx — the backend's answer is authoritative.
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number') return status >= 500 && status <= 599 && attempt <= 3
    if (status !== 'FETCH_ERROR' && status !== 'TIMEOUT_ERROR') return false
  }
  return attempt <= 3
}

const sessionChangedError = {
  status: 'CUSTOM_ERROR' as const,
  error: 'Session changed while the request was in progress.',
}

/** The backend rejects `limit` above 100 with 422, so never send more. */
function clampLimit(value: unknown): unknown {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n)) return value
  return n > MAX_PAGE_LIMIT ? MAX_PAGE_LIMIT : value
}

/**
 * fetchBaseQuery serializes `null` as the string "null" (e.g. `?cursor=null`),
 * which backends reject as INVALID_CURSOR. Drop null/undefined (and empty
 * cursor strings) so page-1 requests omit the param entirely. `limit` is held
 * to the backend maximum of 100.
 */
export function sanitizeFetchArgs(args: string | FetchArgs): string | FetchArgs {
  if (typeof args === 'string' || !args.params) return args
  // URLSearchParams inputs (e.g. the properties `toSearchParams` builder)
  // must pass through untouched: Object.entries() sees no own enumerable keys
  // on a URLSearchParams instance, so the plain-object path below would
  // silently strip every query param (breaking status/cursor/sort filters).
  if (args.params instanceof URLSearchParams) {
    const limit = args.params.get('limit')
    if (limit === null || Number(limit) <= MAX_PAGE_LIMIT) return args
    const params = new URLSearchParams(args.params)
    params.set('limit', String(MAX_PAGE_LIMIT))
    return { ...args, params }
  }
  if (typeof args.params !== 'object' || Array.isArray(args.params)) return args
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(args.params as Record<string, unknown>)) {
    if (value === null || value === undefined) continue
    if (key === 'cursor' && value === '') continue
    cleaned[key] = key === 'limit' ? clampLimit(value) : value
  }
  return { ...args, params: cleaned }
}

/**
 * One refresh at a time. Refresh tokens rotate, so concurrent 401s must share
 * the same refresh call instead of racing each other.
 */
let refreshInFlight: { accountId: string; promise: Promise<string | null> } | null = null

/**
 * Ask Supabase for a fresh session. Resolves to the new access token, or null when no session can be refreshed.
 * A refresh is shared only between callers of the same account: another account never receives this token.
 */
function refreshAccessToken(accountId: string): Promise<string | null> {
  if (!supabase) return Promise.resolve(null)
  if (refreshInFlight?.accountId === accountId) return refreshInFlight.promise
  const client = supabase
  refreshInFlight = {
    accountId,
    promise: (async () => {
      try {
        const { data, error } = await client.auth.refreshSession()
        if (error || !data.session || data.session.user.id !== accountId) return null
        return data.session.access_token
      } catch {
        return null
      } finally {
        if (refreshInFlight?.accountId === accountId) refreshInFlight = null
      }
    })(),
  }
  return refreshInFlight.promise
}

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const originalAuth = (api.getState() as { auth: AuthState }).auth
  const sessionVersion = originalAuth.sessionVersion
  const sessionChanged = () =>
    (api.getState() as { auth: AuthState }).auth.sessionVersion !== sessionVersion
  // Bind every retry to the starting session. A queued retry must never pick
  // up a different account's token from prepareHeaders.
  const sessionBoundQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    requestArgs,
    requestApi,
    requestOptions,
  ) => {
    if ((requestApi.getState() as { auth: AuthState }).auth.sessionVersion !== sessionVersion) {
      return { error: sessionChangedError }
    }
    const response = await baseQueryNoRetryOnAuth(requestArgs, requestApi, requestOptions)
    if ((requestApi.getState() as { auth: AuthState }).auth.sessionVersion !== sessionVersion) {
      return { error: sessionChangedError }
    }
    return response
  }
  const sessionBoundQueryWithRetries = retry(sessionBoundQuery, {
    retryCondition: (error, requestArgs, { attempt, extraOptions: options }) =>
      shouldRetryRequest({ error, args: requestArgs, attempt, extraOptions: options }),
  })

  /** One full attempt (with the GET retry policy). Reports which token it was sent with. */
  const attempt = async () => {
    const tokenUsed = (api.getState() as { auth: AuthState }).auth.token
    const response = await sessionBoundQueryWithRetries(sanitizeFetchArgs(args), api, extraOptions)
    return { response, tokenUsed }
  }

  let { response: result, tokenUsed } = await attempt()
  if (sessionChanged()) return { error: sessionChangedError }

  // A 401 with a live session usually means the access token expired or was
  // rotated while the request was in flight. Get the current token and send
  // the request once more. At most two retries: one for a token that rotated
  // in flight, and one after a single forced refresh.
  let forcedRefresh = false
  for (let retries = 0; retries < 2 && result.error?.status === 401; retries += 1) {
    const current = (api.getState() as { auth: AuthState }).auth
    if (!current.token || !current.accountId) break
    if (current.token === tokenUsed) {
      // Same token that just failed: force a refresh, once per request. The retried
      // request carries the refreshed token because prepareHeaders reads Redux first.
      if (forcedRefresh) break
      forcedRefresh = true
      const refreshed = await refreshAccessToken(current.accountId)
      if (sessionChanged()) return { error: sessionChangedError }
      if (!refreshed) break
      const latest = (api.getState() as { auth: AuthState }).auth
      if (latest.accountId !== current.accountId) return { error: sessionChangedError }
      if (latest.token === tokenUsed) api.dispatch(setAccessToken({ token: refreshed, accountId: current.accountId }))
    }
    const retried = await attempt()
    result = retried.response
    tokenUsed = retried.tokenUsed
    if (sessionChanged()) return { error: sessionChangedError }
  }

  const currentAuth = (api.getState() as { auth: AuthState }).auth
  if (result.error && result.error.status === 401) {
    // Sign out only when the retried request, sent with the current token, also got a 401.
    if (currentAuth.token !== tokenUsed) return result
    // Only clear an active session. Anonymous requests can receive 401 by design.
    const hadSession = Boolean(currentAuth.token && currentAuth.accountId)
    if (hadSession) {
      api.dispatch(clearCredentials())
      // Sign out only the same Supabase session. Another account can sign in
      // while the failed request or getSession call is still in flight.
      if (supabase && originalAuth.accountId) {
        const client = supabase
        const expectedAccountId = originalAuth.accountId
        const expectedToken = currentAuth.token
        void client.auth.getSession().then(({ data }) => {
          if (data.session?.user.id === expectedAccountId &&
              (data.session.access_token === expectedToken || data.session.access_token === tokenUsed)) {
            return client.auth.signOut()
          }
        }).catch(() => {
          // Redux session state is already cleared.
        })
      }
      toast({
        title: 'Session expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      })
    }
  }
  if (result.error && result.error.status === 403 && currentAuth.token && currentAuth.accountId) {
    requestStaffProfileRecheck()
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  // Cache retention controls memory only. Refetch older active views on mount.
  refetchOnMountOrArgChange: 60,
  refetchOnFocus: true,
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
    'Notification',
  ],
  endpoints: () => ({}),
})
