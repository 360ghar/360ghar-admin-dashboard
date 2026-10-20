import type { AuthMethod as ApiAuthMethod, SelfUser } from '@/types'
import { API_BASE_URL, ALLOWED_GOOGLE_EMAIL_DOMAINS } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import { isRecord } from '@/lib/storage'

export interface ProfileFetchResult {
  user: SelfUser | null
  /** HTTP status when the backend responded; null on network/parse failure. */
  status: number | null
}

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null)

/**
 * Validate `GET /users/profile` (`SelfUser`) at the boundary. The backend
 * allows a null email, name and phone, and the portal keeps them null: it
 * shows a placeholder instead of inventing an empty string.
 *
 * Fetch the backend profile, distinguishing "backend says there is no such
 * staff account" (404) from "backend unreachable / transient failure"
 * (status === null). Callers use the distinction to decide between bouncing
 * the user (404) and falling back to a cached profile (transient).
 */
function normalizeUserProfile(value: unknown): SelfUser | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'number' || !Number.isInteger(value.id) || value.id <= 0) return null
  if (typeof value.supabase_user_id !== 'string' || !value.supabase_user_id) return null
  if (value.email != null && typeof value.email !== 'string') return null
  if (value.full_name != null && typeof value.full_name !== 'string') return null
  if (value.role !== 'admin' && value.role !== 'agent' && value.role !== 'user') return null
  if (typeof value.is_active !== 'boolean' || typeof value.is_verified !== 'boolean') return null
  if (typeof value.created_at !== 'string') return null
  if (value.updated_at != null && typeof value.updated_at !== 'string') return null
  if (value.agent_id != null && typeof value.agent_id !== 'number') return null
  return {
    id: value.id,
    supabase_user_id: value.supabase_user_id,
    email: stringOrNull(value.email),
    full_name: stringOrNull(value.full_name),
    phone: stringOrNull(value.phone),
    date_of_birth: stringOrNull(value.date_of_birth),
    profile_image_url: stringOrNull(value.profile_image_url),
    role: value.role,
    is_active: value.is_active,
    is_verified: value.is_verified,
    phone_verified: value.phone_verified === true,
    email_verified: value.email_verified === true,
    agent_id: typeof value.agent_id === 'number' ? value.agent_id : null,
    created_at: value.created_at,
    updated_at: stringOrNull(value.updated_at),
  }
}

export async function fetchUserProfileWithStatus(
  token: string,
  expectedAccountId?: string,
): Promise<ProfileFetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    // No trailing slash: backend redirect_slashes=False → `/users/profile/` is 404.
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      // Log non-404 failures so transient backend errors aren't invisible.
      if (res.status !== 404) {
        console.error(`[auth] fetchUserProfile failed: ${res.status}`)
      }
      return { user: null, status: res.status }
    }
    const value: unknown = await res.json()
    const user = normalizeUserProfile(value)
    if (!user || (expectedAccountId && user.supabase_user_id !== expectedAccountId)) {
      return { user: null, status: res.status }
    }
    return { user, status: res.status }
  } catch {
    return { user: null, status: null }
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchUserProfileWithToken(token: string): Promise<SelfUser | null> {
  const { user } = await fetchUserProfileWithStatus(token)
  return user
}

/**
 * Origin-scoped OAuth callback URL for Supabase redirectTo.
 * Eager-evaluated at module load using window.location.origin. The raw template
 * literal is safe — window.location.origin never contains query params, and using
 * a module-level constant avoids re-allocating a URL object on every auth call.
 *
 * NOTE: if this module is imported in a non-browser context (Vitest, SSR) where
 * `window` is not defined, this line will throw. Tests that import auth.ts
 * without a JSDOM-like global should either mock window or import only sub-modules.
 */
export const OAUTH_CALLBACK_URL = `${window.location.origin}/auth/callback`

/**
 * Start the Google OAuth redirect flow. Supabase redirects to Google, then back
 * to `${origin}/auth/callback?code=...` where `AuthCallbackPage` exchanges the
 * code for a session and enforces the staff gate.
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_CALLBACK_URL,
    },
  })
  if (error) throw error
}

export type IdentifierChannel = 'phone' | 'email'
export type IdentifierNextStep = 'password' | 'otp'

/** Mirrors `IdentifierStatusResponse` (`channel` is `email|phone`, `next_step` is `password|otp`). */
export interface IdentifierStatus {
  exists: boolean
  verified: boolean
  has_password: boolean
  channel: IdentifierChannel
  next_step: IdentifierNextStep
}

function isIdentifierStatus(value: unknown): value is IdentifierStatus {
  if (!isRecord(value)) return false
  return typeof value.exists === 'boolean' && typeof value.verified === 'boolean' &&
    typeof value.has_password === 'boolean' &&
    (value.channel === 'phone' || value.channel === 'email') &&
    (value.next_step === 'password' || value.next_step === 'otp')
}

/**
 * Ask the backend whether an identifier (phone or email) maps to a verified
 * account and which next step to take. Powers the login state-machine:
 * verified -> password; unverified/unknown -> OTP-first.
 *
 * The endpoint is public, rate-limited and returns a neutral shape to limit
 * user enumeration.
 */
export async function checkIdentifierStatus(identifier: string): Promise<IdentifierStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/identifier-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    })
    if (!res.ok) {
      return null
    }
    const value: unknown = await res.json()
    return isIdentifierStatus(value) ? value : null
  } catch {
    // Network / CORS / backend-down — caller falls back to default flow
    return null
  }
}

/** The backend `AuthMethod` enum: google, apple, email_password, phone_password, phone_otp, email_otp. */
export type AuthMethod = ApiAuthMethod

/**
 * Mirror the last-used auth method to the backend (best-effort; never throws).
 * Requires an authenticated session token.
 */
export async function recordLastAuthMethod(token: string, method: AuthMethod): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/last-method`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ method }),
    })
  } catch {
    // best-effort only — analytics-style signal, not part of the auth result
  }
}

/**
 * True when the email's domain is allowed for Google sign-in into the portal.
 * An empty allowlist means "no domain restriction" (rely on the role guard).
 */
// ---------------------------------------------------------------------------
// Shared identifier helpers (used by LoginPage, ForgotPasswordPage, SignupPage)
// ---------------------------------------------------------------------------

export function isEmail(identifier: string): boolean {
  return identifier.includes('@')
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  // 10-digit Indian mobile number → prepend +91
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

/** Normalize the raw identifier into the canonical phone/email value to send to Supabase. */
export function normalizeIdentifier(identifier: string, channel: IdentifierChannel): string {
  return channel === 'email' ? identifier.trim().toLowerCase() : normalizePhone(identifier)
}

/**
 * Send (or resend) a 6-digit OTP via Supabase. Works for both login and
 * forgot-password flows. `shouldCreateUser: false` prevents silent account
 * provisioning on mistyped identifiers.
 */
export async function sendOtp(
  canonical: string,
  channel: IdentifierChannel,
  options?: { shouldCreateUser?: boolean; emailRedirectTo?: string },
): Promise<void> {
  const sb = requireSupabase()
  const { error } =
    channel === 'email'
      ? await sb.auth.signInWithOtp({
          email: canonical,
          options: {
            shouldCreateUser: options?.shouldCreateUser ?? false,
            emailRedirectTo: options?.emailRedirectTo ?? OAUTH_CALLBACK_URL,
          },
        })
      : await sb.auth.signInWithOtp({
          phone: canonical,
          options: { shouldCreateUser: options?.shouldCreateUser ?? false },
        })
  if (error) throw error
}

/**
 * Guard that throws a user-facing message if Supabase is not configured.
 * Returns the non-null supabase client for TypeScript narrowing.
 */
export function requireSupabase(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase is not configured. Please set environment variables.')
  return supabase
}

export function isAllowedGoogleEmail(email: string | null | undefined): boolean {
  if (!ALLOWED_GOOGLE_EMAIL_DOMAINS.length) return true
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain) return false
  return ALLOWED_GOOGLE_EMAIL_DOMAINS.some((d) => d.toLowerCase() === domain)
}
