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
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { OtpInput } from '@/components/auth/OtpInput'
import { ArrowLeft } from 'lucide-react'
import { GoogleIcon } from '@/components/ui/google-icon'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useEffect, useMemo, useState } from 'react'
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
import { getLastAuthMethod, setLastAuthMethod, maskIdentifier } from '@/lib/lastAuthMethod'
import { useWebOtp } from '@/hooks/useWebOtp'
import { useResendTimer } from '@/hooks/useResendTimer'
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
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

const METHOD_LABELS: Record<AuthMethod, string> = {
  google: 'Google',
  email_password: 'email & password',
  phone_password: 'phone & password',
  phone_otp: 'phone OTP',
  email_otp: 'email OTP',
}

/** Map well-known `?error=` codes from PrivateRoute / deep links to human text. */
function mapLoginQueryError(raw: string): string {
  if (raw === 'session-timeout') {
    return 'We could not restore your session in time. Please sign in again.'
  }
  return raw
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
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
    }
  }, [])

  // Already signed-in users should not sit on the login form.
  // Skip while mid set-password (isLoginInProgress) — credentials are not set yet.
  useEffect(() => {
    if (authInitialized && isAuthenticated && step !== 'set-password') {
      navigate('/dashboard', { replace: true })
    }
  }, [authInitialized, isAuthenticated, navigate, step])

  // Surface auth-callback errors (e.g. unauthorized Google account) on the login screen.
  useEffect(() => {
    const queryError = searchParams.get('error')
    if (queryError) setErrorMessage(mapLoginQueryError(queryError))
  }, [searchParams])

  // Optional success/info flash from signup / forgot-password (via navigate state).
  useEffect(() => {
    const state = location.state as { info?: string } | null
    if (state?.info) {
      setInfoMessage(state.info)
      // Clear so a refresh doesn't re-show it.
      navigate(location.pathname + location.search, { replace: true, state: {} })
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
    dispatch(clearCredentials())
    void import('@/lib/supabase').then(({ supabase: sb }) => {
      if (sb) {
        void sb.auth.signOut().finally(() => resetToIdentifier())
      } else {
        resetToIdentifier()
      }
    })
  }

  const finishLogin = async (accessToken: string, method: AuthMethod) => {
    isLoginInProgress.current = true
    try {
      const { user, status } = await fetchUserProfileWithStatus(accessToken)
      if (!user) {
        throw new Error(
          status === 404
            ? 'Signed in, but your account is not authorized for the admin portal.'
            : 'Could not verify your account. Please try again.',
        )
      }
      dispatch(setCredentials({ token: accessToken, user }))
      setLastAuthMethod(method, displayIdentifier || normalized)
      void recordLastAuthMethod(accessToken, method)
      navigate('/dashboard', { replace: true })
    } finally {
      // Reset the flag if navigation didn't happen (e.g. profile fetch failed).
      isLoginInProgress.current = false
    }
  }

  const handleGoogle = async () => {
    setErrorMessage(null)
    setGoogleLoading(true)
    try {
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

      if (status.exists && !status.verified) {
        setInfoMessage(UNVERIFIED_ACCOUNT_MESSAGE)
      }

      // Unverified / unknown -> OTP-first.
      await sendOtp(canonical, resolvedChannel)
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendOtp = async (canonical: string, ch: IdentifierChannel) => {
    requireSupabase()
    // Login never creates accounts; pass explicit false (helper also defaults to false).
    await sendOtpRequest(canonical, ch, { shouldCreateUser: false })
    setStep('otp')
    otpForm.reset()
    setOtpVersion((v) => v + 1)
    resendTimer.start()
    setInfoMessage(
      ch === 'email'
        ? `We sent a 6-digit code to ${canonical}.`
        : `We sent a 6-digit code via SMS to ${canonical}.`
    )
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
      await finishLogin(result.data.session.access_token, method)
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

      // Requirement 6: if the account has no password, FORCE a mandatory
      // set-password step before completing login. Not applied to Google.
      if (!hasPassword) {
        setOtpAccessToken(accessToken)
        setInfoMessage(null)
        setPasswordForm.reset()
        setStep('set-password')
        holdLoginFlag = true
        return
      }

      const method: AuthMethod = channel === 'email' ? 'email_otp' : 'phone_otp'
      await finishLogin(accessToken, method)
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
      const { error } = await sb.auth.updateUser({ password: values.password })
      if (error) throw error
      // Session token is unchanged by updateUser; reuse the one from OTP verify.
      const { data } = await sb.auth.getSession()
      const accessToken = data.session?.access_token ?? otpAccessToken
      if (!accessToken) {
        throw new Error('Your session expired. Please sign in again.')
      }
      const method: AuthMethod = channel === 'email' ? 'email_password' : 'phone_password'
      await finishLogin(accessToken, method)
    } catch (err) {
      const error = mapSupabaseAuthError(err)
      dispatch(setError(error))
      setErrorMessage(error)
      // Stay on set-password; keep flag held so SIGNED_IN still cannot race.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <AuthBrandingPanel
        title="360Ghar"
        subtitle="Real Estate Management Platform"
        features={[
          'Comprehensive property management',
          'Advanced analytics & reporting',
          'Seamless agent coordination',
          'Real-time booking system',
        ]}
      />

      <AuthCardLayout
        title="Welcome Back"
        subtitle="Sign in to your admin dashboard"
        errorMessage={errorMessage}
        infoMessage={infoMessage}
        footer={
          step === 'identifier' ? (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">Secure access to 360Ghar Admin Portal</p>
            </div>
          ) : undefined
        }
      >
            {lastMethod && step === 'identifier' && (
              <p className="text-center text-sm text-muted-foreground">
                Last time you signed in with{' '}
                <span className="font-medium text-foreground">{METHOD_LABELS[lastMethod.method]}</span>
                {lastMethod.identifierHint ? ` (${lastMethod.identifierHint})` : ''}.
              </p>
            )}

            {/* Google — only on the entry step. Hidden once a flow is in progress so
                it can't be used to bypass the mandatory set-password step. */}
            {step === 'identifier' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-base font-medium gap-2"
                  onClick={() => void handleGoogle()}
                  disabled={googleLoading || isSubmitting}
                >
                  {googleLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  Sign in with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
              </>
            )}

            {/* Step 1: identifier */}
            {step === 'identifier' && (
              <Form {...identifierForm}>
                <form
                  onSubmit={(e) => void identifierForm.handleSubmit(onIdentifierSubmit)(e)}
                  className="space-y-5"
                >
                  <FormField
                    control={identifierForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Phone number or email</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="text"
                            autoComplete="username"
                            placeholder="+91XXXXXXXXXX or you@360ghar.com"
                            className="h-11 px-4 text-base"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-2">
                    <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Checking...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2a: password */}
            {step === 'password' && (
              <Form {...passwordForm}>
                <form
                  onSubmit={(e) => void passwordForm.handleSubmit(onPasswordSubmit)(e)}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground">
                    Signing in as <span className="font-medium text-foreground">{displayIdentifier}</span>
                  </p>
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            show={showPassword}
                            onToggleShow={() => setShowPassword(!showPassword)}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            className="pl-4 h-11 text-base"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-2 space-y-3">
                    <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={resetToIdentifier}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> Use a different account
                      </button>
                      <Link to="/forgot-password" className="text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2b: OTP */}
            {step === 'otp' && (
              <Form {...otpForm}>
                <form onSubmit={(e) => void otpForm.handleSubmit(onOtpSubmit)(e)} className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to{' '}
                    <span className="font-medium text-foreground">{displayIdentifier}</span>
                  </p>
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Verification code</FormLabel>
                        <FormControl>
                          <OtpInput
                            placeholder="123456"
                            className="h-11 px-4 text-base tracking-[0.5em] text-center"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-2 space-y-3">
                    <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Sign In'
                      )}
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={resetToIdentifier}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResendOtp()}
                        disabled={isSubmitting || !resendTimer.canResend}
                        className="text-primary hover:underline disabled:no-underline disabled:opacity-50"
                      >
                        {resendTimer.isActive ? `Resend code in ${resendTimer.secondsLeft}s` : 'Resend code'}
                      </button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: mandatory set-password (no skip / no back) */}
            {step === 'set-password' && (
              <Form {...setPasswordForm}>
                <form
                  onSubmit={(e) => void setPasswordForm.handleSubmit(onSetPasswordSubmit)(e)}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground">
                    Setting a password for{' '}
                    <span className="font-medium text-foreground">
                      {maskIdentifier(normalized || displayIdentifier)}
                    </span>
                    . Your account doesn&apos;t have one yet — set it to finish signing in and use it
                    next time.
                  </p>
                  <FormField
                    control={setPasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">New password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            show={showPassword}
                            onToggleShow={() => setShowPassword(!showPassword)}
                            autoComplete="new-password"
                            placeholder="Create a password"
                            className="pl-4 h-11 text-base"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setPasswordForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="Re-enter password"
                            className="h-11 px-4 text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-2">
                    <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Set Password & Continue'
                      )}
                    </Button>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={abandonSetPassword}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        This isn&apos;t my account
                      </button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {step === 'identifier' && (
              <div className="pt-2 flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
                <Link to="/signup" className="text-primary hover:underline">
                  New agent? Sign up
                </Link>
              </div>
            )}
      </AuthCardLayout>
    </div>
  )
}

export default LoginPage
