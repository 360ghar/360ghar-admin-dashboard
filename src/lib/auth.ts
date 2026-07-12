import type { User } from '@/types'
import { API_BASE_URL, ALLOWED_GOOGLE_EMAIL_DOMAINS } from '@/lib/config'
import { supabase } from '@/lib/supabase'

export async function fetchUserProfileWithToken(token: string): Promise<User | null> {
  try {
    // No trailing slash: backend redirect_slashes=False → `/users/profile/` is 404.
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      // Log non-404 failures so transient backend errors aren't invisible.
      if (res.status !== 404) {
        console.error(`[auth] fetchUserProfile failed: ${res.status}`)
      }
      return null
    }
    return (await res.json()) as User
  } catch {
    return null
  }
}

/**
 * Start the Google OAuth redirect flow. Supabase redirects to Google, then back
 * to `${origin}/auth/callback?code=...` where `AuthCallbackPage` exchanges the
 * code for a session and enforces the staff gate.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set environment variables.')
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

export type IdentifierChannel = 'phone' | 'email'
export type IdentifierNextStep = 'password' | 'otp'

export interface IdentifierStatus {
  exists: boolean
  verified: boolean
  has_password: boolean
  channel: IdentifierChannel
  next_step: IdentifierNextStep
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
    return (await res.json()) as IdentifierStatus
  } catch {
    // Network / CORS / backend-down — caller falls back to default flow
    return null
  }
}

export type AuthMethod =
  | 'google'
  | 'email_password'
  | 'phone_password'
  | 'phone_otp'
  | 'email_otp'

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
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } =
    channel === 'email'
      ? await supabase.auth.signInWithOtp({
          email: canonical,
          options: {
            shouldCreateUser: options?.shouldCreateUser ?? false,
            emailRedirectTo: options?.emailRedirectTo ?? `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithOtp({
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
