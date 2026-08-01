import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '@/hooks/redux'
import { setCredentials, setError } from '@/features/auth/slices/authSlice'
import { supabase } from '@/lib/supabase'
import {
  fetchUserProfileWithStatus,
  isAllowedGoogleEmail,
  recordLastAuthMethod,
} from '@/lib/auth'
import { isLoginInProgress } from '@/lib/loginState'
import { setLastAuthMethod } from '@/lib/lastAuthMethod'
import { mapSupabaseAuthError } from '@/lib/authErrors'
import { LoadingState } from '@/components/ui/loading-state'

/**
 * OAuth (Google) redirect landing page.
 *
 * Exchanges the `code` for a Supabase session, then mirrors `LoginPage.onSubmit`:
 * fetch the backend profile and `setCredentials`. Enforces the staff gate:
 *  1. optional `@360ghar.com` email-domain allowlist (sign out + message if the
 *     domain is not allowed);
 *  2. the existing `RoleBasedRoute` guard then bounces any authenticated but
 *     non-staff user (role derived from the profile) to `/access-denied`.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const ranRef = useRef(false)

  useEffect(() => {
    // React 18 StrictMode double-invokes effects in dev; the OAuth `code` is
    // single-use, so guard with a ref that survives the remount. Do NOT cancel
    // the in-flight run on cleanup — that would drop the only exchange attempt.
    if (ranRef.current) return
    ranRef.current = true

    const failTo = (message: string) => {
      isLoginInProgress.current = false
      dispatch(setError(message))
      navigate(`/login?error=${encodeURIComponent(message)}`, { replace: true })
    }

    const run = async () => {
      // Block App.tsx SIGNED_IN from racing a parallel profile fetch while we
      // enforce the Google domain + staff profile gates ourselves.
      isLoginInProgress.current = true

      if (!supabase) {
        failTo('Supabase is not configured. Please set environment variables.')
        return
      }

      const client = supabase
      const code = searchParams.get('code')
      const oauthError = searchParams.get('error_description') || searchParams.get('error')

      if (oauthError) {
        failTo(oauthError)
        return
      }
      if (!code) {
        failTo('Sign-in could not be completed. Please try again.')
        return
      }

      let timedOut = false

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true
            reject(new Error('Request timed out. Please try again.'))
          }, 15000)
        )
        const { data, error } = await Promise.race([
          client.auth.exchangeCodeForSession(code),
          timeoutPromise,
        ])
        if (error || !data.session) {
          throw error ?? new Error('Sign-in could not be completed. Please try again.')
        }

        const session = data.session
        const email = session.user?.email ?? null

        // Staff gate (step 1): optional email-domain allowlist.
        if (!isAllowedGoogleEmail(email)) {
          try { await client.auth.signOut() } catch { /* best-effort signout */ }
          failTo('This Google account is not authorized for the admin portal.')
          return
        }

        const accessToken = session.access_token
        const { user, status } = await fetchUserProfileWithStatus(accessToken)
        if (!user) {
          if (status === 404) {
            // No backend profile -> not a provisioned staff member.
            try { await client.auth.signOut() } catch { /* best-effort signout */ }
            failTo('Your account is not authorized for the admin portal.')
          } else {
            // Transient failure — keep the Supabase session (App.tsx may retry
            // the profile fetch) and surface a retryable message.
            failTo('Could not verify your account. Please try again.')
          }
          return
        }

        dispatch(setCredentials({ token: accessToken, user }))
        setLastAuthMethod('google', email ?? undefined)
        void recordLastAuthMethod(accessToken, 'google')

        // Staff gate (step 2): RoleBasedRoute bounces non-staff to /access-denied.
        isLoginInProgress.current = false
        navigate('/dashboard', { replace: true })
      } catch (err) {
        // If the timeout fired, the exchange may still complete in the
        // background and set a Supabase session. Sign out to be safe.
        if (timedOut) {
          try { await client.auth.signOut() } catch { /* best-effort */ }
        }
        failTo(mapSupabaseAuthError(err))
      }
    }

    void run()
  }, [dispatch, navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <LoadingState type="spinner" text="Completing sign-in..." />
    </div>
  )
}
