/**
 * API base URL. In dev, requests go to the same origin (`window.location.origin`),
 * which Vite proxies to `DEV_API_PROXY_TARGET` (see vite.config.ts) — no CORS,
 * immune to dev-port drift, and still an absolute URL (fetchBaseQuery's
 * `new Request(...)` rejects relative URLs). Production builds use the
 * absolute `VITE_API_BASE_URL` (or the local default below).
 */
export const API_BASE_URL = import.meta.env.DEV
  ? `${window.location.origin}/api/v1`
  : (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3600/api/v1'

/**
 * Optional realtime endpoint (SSE or WebSocket) for live cache invalidation.
 * When unset, the realtime hook is a no-op. Example:
 *   VITE_REALTIME_URL=https://api.example.com/api/v1/realtime
 */
export const REALTIME_URL: string | undefined =
  (import.meta.env.VITE_REALTIME_URL as string | undefined) ?? undefined

/**
 * Optional email-domain allowlist for Google sign-in into the admin/agent
 * portal. When non-empty, a Google sign-in whose email domain is not in this
 * list is signed out at the callback with a clear message (defence-in-depth on
 * top of the role guard, which already bounces non-staff). Leave empty to rely
 * solely on the role guard.
 *
 * Configure via the comma-separated `VITE_ALLOWED_GOOGLE_EMAIL_DOMAINS` env
 * var (e.g. "360ghar.com,example.com"). When unset, defaults to the staff
 * domain `360ghar.com` so existing deployments keep their current policy.
 */
const rawAllowedDomains = import.meta.env.VITE_ALLOWED_GOOGLE_EMAIL_DOMAINS as string | undefined

export const ALLOWED_GOOGLE_EMAIL_DOMAINS: readonly string[] = rawAllowedDomains
  ? rawAllowedDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  : ['360ghar.com']
