import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import {
  clearCredentials,
  selectAuthInitialized,
  selectIsAuthenticated,
  setCredentials,
  setError,
} from '@/features/auth/slices/authSlice'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IDENTIFIER_STATUS_UNAVAILABLE_MESSAGE,
  mapSupabaseAuthError,
  UNVERIFIED_ACCOUNT_MESSAGE,
} from '@/lib/authErrors'
import {
  fetchUserProfileWithStatus,
  signInWithGoogle as startGoogleSignIn,
  checkIdentifierStatus,
  recordLastAuthMethod,
  sendOtp as sendOtpRequest,
  isEmail,
  normalizeIdentifier,
  requireSupabase,
  type IdentifierChannel,
  type AuthMethod,
} from '@/lib/auth'
import { isLoginInProgress } from '@/lib/loginState'
import { getLastAuthMethod, setLastAuthMethod } from '@/lib/lastAuthMethod'
import { useWebOtp } from '@/hooks/useWebOtp'
import { useResendTimer } from '@/hooks/useResendTimer'
import { consumePostLoginDestination, peekPostLoginDestination, rememberPostLoginDestination, safePostLoginDestination } from '../lib/postLoginDestination'
import {
  identifierSchema,
  passwordStepSchema,
  otpStepSchema,
  setPasswordStepSchema,
  type IdentifierFormValues,
  type PasswordStepFormValues,
  type OtpStepFormValues,
  type SetPasswordStepFormValues,
} from '@/features/auth/validations'

type Step = 'identifier' | 'password' | 'otp' | 'set-password'

/** Map well-known `?error=` codes from PrivateRoute / deep links to human text. */
function mapLoginQueryError(raw: string): string {
  if (raw === 'session-timeout') {
    return 'We could not restore your session in time. Please sign in again.'
  }
  return raw
}

export function useLoginFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const requestedDestination = useRef(safePostLoginDestination(
    (location.state as { from?: unknown } | null)?.from ?? peekPostLoginDestination(),
  ))
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const authInitialized = useAppSelector(selectAuthInitialized)

  const [step, setStep] = useState<Step>('identifier')
  const [channel, setChannel] = useState<IdentifierChannel>('phone')
  // The canonical identifier (normalized phone/email) carried across steps.
  const [normalized, setNormalized] = useState('')
  const [displayIdentifier, setDisplayIdentifier] = useState('')
  // Whether the account already has a password. Drives the mandatory
  // set-password step after OTP. Unknown identifier (exists === false) => false.
  const [hasPassword, setHasPassword] = useState(false)
  // Session token from a successful OTP verify, held while the user sets a password.
  const [otpAccessToken, setOtpAccessToken] = useState<string | null>(null)
  // The account the OTP session belongs to, and whether the flow waits on a password.
  const otpAccountId = useRef<string | null>(null)
  const awaitingPassword = useRef(false)

  const [otpVersion, setOtpVersion] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const lastMethod = useMemo(() => getLastAuthMethod(), [])

  const identifierForm = useForm<IdentifierFormValues>({
    resolver: zodResolver(identifierSchema),
    defaultValues: { identifier: '' },
  })
  const passwordForm = useForm<PasswordStepFormValues>({
    resolver: zodResolver(passwordStepSchema),
    defaultValues: { password: '' },
  })
  const otpForm = useForm<OtpStepFormValues>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { otp: '' },
  })
  const setPasswordForm = useForm<SetPasswordStepFormValues>({
    resolver: zodResolver(setPasswordStepSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  // 30s cooldown for the "Resend code" control on the OTP step.
  const resendTimer = useResendTimer()

  // If the page unmounts mid-flow (e.g. user navigates away during set-password),
  // never leave the global race flag stuck true for the rest of the SPA session.
  useEffect(() => {
    return () => {
      isLoginInProgress.current = false
      // Leaving during set-password must not keep a passwordless OTP session.
      if (awaitingPassword.current) {
        awaitingPassword.current = false
        const accountId = otpAccountId.current
        // Sign out only the OTP session. A different account may have replaced it meanwhile.
        void import('@/lib/supabase')
          .then(async ({ supabase: sb }) => {
            const { data } = (await sb?.auth.getSession()) ?? { data: null }
            if (data?.session?.user.id === accountId) await sb?.auth.signOut()
          })
          .catch(() => {})
      }
    }
  }, [])

  // Already signed-in users should not sit on the login form.
  // Skip while mid set-password (isLoginInProgress) — credentials are not set yet.
  useEffect(() => {
    if (authInitialized && isAuthenticated && step !== 'set-password') {
      consumePostLoginDestination()
      navigate(requestedDestination.current, { replace: true })
    }
  }, [authInitialized, isAuthenticated, navigate, step])

  // Surface auth-callback errors (e.g. unauthorized Google account) on the login screen.
  useEffect(() => {
    const queryError = searchParams.get('error')
    if (queryError) setErrorMessage(mapLoginQueryError(queryError))
  }, [searchParams])

  // Optional success/info flash from signup / forgot-password (via navigate state).
  useEffect(() => {
    const state = location.state as { info?: string; from?: unknown } | null
    if (state?.info) {
      setInfoMessage(state.info)
      // Clear so a refresh doesn't re-show it.
      navigate(location.pathname + location.search, { replace: true, state: { from: state.from } })
    }
  }, [location.state, location.pathname, location.search, navigate])

  // Android Chrome SMS OTP autofill — only while the OTP step is shown for a phone.
  // `otpVersion` re-arms the hook on each resend so a stale pending request is
  // replaced by a fresh one.
  useWebOtp(
    (code) => {
      otpForm.setValue('otp', code, { shouldValidate: true })
    },
    step === 'otp' && channel === 'phone',
    otpVersion,
  )

  const resetToIdentifier = () => {
    isLoginInProgress.current = false
    awaitingPassword.current = false
    otpAccountId.current = null
    setStep('identifier')
    setNormalized('')
    setDisplayIdentifier('')
    setErrorMessage(null)
    setInfoMessage(null)
    setOtpAccessToken(null)
    setHasPassword(false)
    passwordForm.reset()
    otpForm.reset()
    setPasswordForm.reset()
    resendTimer.reset()
  }

  const abandonSetPassword = () => {
    // User rejected the session (wrong account) during mandatory set-password.
    isLoginInProgress.current = false
    awaitingPassword.current = false
    dispatch(clearCredentials())
    void import('@/lib/supabase').then(({ supabase: sb }) => {
      if (sb) {
        void sb.auth.signOut().finally(() => resetToIdentifier())
      } else {
        resetToIdentifier()
      }
    })
  }

  const finishLogin = async (accessToken: string, method: AuthMethod, accountId: string) => {
    isLoginInProgress.current = true
    try {
      const { data } = await requireSupabase().auth.getSession()
      const session = data.session
      if (!session) throw new Error('Your session expired. Please sign in again.')
      // Another account may have signed in while this flow was waiting.
      if (session.user.id !== accountId) throw new Error('Your session changed. Please sign in again.')
      const currentToken = session.access_token || accessToken
      const { user, status } = await fetchUserProfileWithStatus(currentToken, session.user.id)
      if (!user || !user.is_active || (user.role !== 'admin' && user.role !== 'agent')) {
        const denied = status === 401 || status === 403 || status === 404 || Boolean(user)
        if (denied) {
          try { await requireSupabase().auth.signOut() } catch { /* Redux state still clears. */ }
          dispatch(clearCredentials())
        }
        throw new Error(
          denied
            ? 'Signed in, but your account is not authorized for the admin portal.'
            : 'Could not verify your account. Please try again.',
        )
      }
      awaitingPassword.current = false
      dispatch(setCredentials({ token: currentToken, user }))
      setLastAuthMethod(method, displayIdentifier || normalized)
      void recordLastAuthMethod(currentToken, method)
      consumePostLoginDestination()
      navigate(requestedDestination.current, { replace: true })
    } finally {
      // Reset the flag if navigation didn't happen (e.g. profile fetch failed).
      isLoginInProgress.current = false
    }
  }

  const handleGoogle = async () => {
    setErrorMessage(null)
    setGoogleLoading(true)
    try {
      rememberPostLoginDestination(requestedDestination.current)
      await startGoogleSignIn()
      // Redirect happens; control leaves the page.
    } catch (err) {
      setGoogleLoading(false)
      setErrorMessage(mapSupabaseAuthError(err))
    }
  }

  const onIdentifierSubmit = async (values: IdentifierFormValues) => {
    setErrorMessage(null)
    setInfoMessage(null)
    setIsSubmitting(true)
    try {
      const raw = values.identifier.trim()
      const detectedChannel: IdentifierChannel = isEmail(raw) ? 'email' : 'phone'

      // Pass the raw (un-normalized) identifier so the backend can look up
      // the account before we commit to a channel or format.
      const status = await checkIdentifierStatus(values.identifier.trim())
      const resolvedChannel = status?.channel ?? detectedChannel
      const canonical = normalizeIdentifier(raw, resolvedChannel)

      setChannel(resolvedChannel)
      setNormalized(canonical)
      setDisplayIdentifier(raw)

      if (!status) {
        setErrorMessage(IDENTIFIER_STATUS_UNAVAILABLE_MESSAGE)
        return
      }

      // Unknown identifier (exists === false) has no password; otherwise trust the flag.
      setHasPassword(status.exists ? status.has_password : false)

      // Verified accounts with a password -> password step.
      if (status.next_step === 'password') {
        setStep('password')
        passwordForm.reset()
        return
      }

      // Unverified / unknown -> OTP-first.
      await sendOtp(canonical, resolvedChannel, status.exists && !status.verified ? UNVERIFIED_ACCOUNT_MESSAGE : undefined)
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendOtp = async (canonical: string, ch: IdentifierChannel, notice?: string) => {
    requireSupabase()
    // Login never creates accounts; pass explicit false (helper also defaults to false).
    await sendOtpRequest(canonical, ch, { shouldCreateUser: false })
    setStep('otp')
    otpForm.reset()
    setOtpVersion((v) => v + 1)
    resendTimer.start()
    const sent = ch === 'email'
      ? `We sent a 6-digit code to ${canonical}.`
      : `We sent a 6-digit code via SMS to ${canonical}.`
    setInfoMessage(notice ? `${notice} ${sent}` : sent)
  }

  const onPasswordSubmit = async (values: PasswordStepFormValues) => {
    const sb = requireSupabase()
    setErrorMessage(null)
    setIsSubmitting(true)
    isLoginInProgress.current = true
    try {
      const result =
        channel === 'email'
          ? await sb.auth.signInWithPassword({ email: normalized, password: values.password })
          : await sb.auth.signInWithPassword({ phone: normalized, password: values.password })
      if (result.error || !result.data.session) {
        throw result.error ?? new Error('Login failed. Please check your credentials.')
      }
      const method: AuthMethod = channel === 'email' ? 'email_password' : 'phone_password'
      await finishLogin(result.data.session.access_token, method, result.data.session.user.id)
    } catch (err) {
      const error = mapSupabaseAuthError(err)
      dispatch(setError(error))
      setErrorMessage(error)
    } finally {
      setIsSubmitting(false)
      // finishLogin resets the flag on its own success/failure path; reset
      // here too so a failed Supabase auth call (wrong credentials) does not
      // leave the flag stuck true, which would make App.tsx's SIGNED_IN
      // handler permanently early-return within this SPA session.
      isLoginInProgress.current = false
    }
  }

  const onOtpSubmit = async (values: OtpStepFormValues) => {
    const sb = requireSupabase()
    setErrorMessage(null)
    setIsSubmitting(true)
    isLoginInProgress.current = true
    // When branching to mandatory set-password, keep the flag true so
    // App.tsx's SIGNED_IN handler does not complete login without a password.
    let holdLoginFlag = false
    try {
      const result =
        channel === 'email'
          ? await sb.auth.verifyOtp({ email: normalized, token: values.otp, type: 'email' })
          : await sb.auth.verifyOtp({ phone: normalized, token: values.otp, type: 'sms' })
      if (result.error || !result.data.session) {
        throw result.error ?? new Error('Invalid or expired code. Please try again.')
      }

      const accessToken = result.data.session.access_token
      const accountId = result.data.session.user.id

      // Requirement 6: if the account has no password, FORCE a mandatory
      // set-password step before completing login. Not applied to Google.
      if (!hasPassword) {
        setOtpAccessToken(accessToken)
        otpAccountId.current = accountId
        awaitingPassword.current = true
        setInfoMessage(null)
        setPasswordForm.reset()
        setStep('set-password')
        holdLoginFlag = true
        return
      }

      const method: AuthMethod = channel === 'email' ? 'email_otp' : 'phone_otp'
      await finishLogin(accessToken, method, accountId)
    } catch (err) {
      const error = mapSupabaseAuthError(err, 'otp')
      dispatch(setError(error))
      setErrorMessage(error)
    } finally {
      setIsSubmitting(false)
      // See onPasswordSubmit: reset here too so a failed verifyOtp (wrong
      // code) doesn't leak the flag and stall App.tsx's SIGNED_IN handler.
      // Hold through set-password so App cannot race-complete login.
      if (!holdLoginFlag) {
        isLoginInProgress.current = false
      }
    }
  }

  const handleResendOtp = async () => {
    if (!resendTimer.canResend) return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await sendOtp(normalized, channel)
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mandatory set-password step (reached only after OTP for a passwordless account).
  const onSetPasswordSubmit = async (values: SetPasswordStepFormValues) => {
    const sb = requireSupabase()
    setErrorMessage(null)
    setIsSubmitting(true)
    // Keep App.tsx from racing while we update the password + finish login.
    isLoginInProgress.current = true
    try {
      // The session may have switched to another account since OTP verify. Do not change its password.
      const { data: current } = await sb.auth.getSession()
      if (!otpAccountId.current || current.session?.user.id !== otpAccountId.current) {
        throw new Error('Your session expired. Please sign in again.')
      }
      const { error } = await sb.auth.updateUser({ password: values.password })
      if (error) throw error
      // Session token is unchanged by updateUser; reuse the one from OTP verify.
      const { data } = await sb.auth.getSession()
      const accessToken = data.session?.access_token ?? otpAccessToken
      if (!accessToken) {
        throw new Error('Your session expired. Please sign in again.')
      }
      const method: AuthMethod = channel === 'email' ? 'email_password' : 'phone_password'
      if (!otpAccountId.current) throw new Error('Your session expired. Please sign in again.')
      await finishLogin(accessToken, method, otpAccountId.current)
    } catch (err) {
      const error = mapSupabaseAuthError(err)
      dispatch(setError(error))
      setErrorMessage(error)
      // Stay on set-password. finishLogin cleared the flag; hold it again so SIGNED_IN still cannot race.
      isLoginInProgress.current = true
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    step, errorMessage, infoMessage, lastMethod,
    identifierForm, onIdentifierSubmit, isSubmitting, googleLoading, handleGoogle,
    passwordForm, onPasswordSubmit, displayIdentifier, showPassword, setShowPassword, resetToIdentifier,
    otpForm, onOtpSubmit, handleResendOtp, resendTimer,
    setPasswordForm, onSetPasswordSubmit, normalized, abandonSetPassword,
  }
}
