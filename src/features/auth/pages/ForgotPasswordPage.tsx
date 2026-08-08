import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import {
  IDENTIFIER_STATUS_UNAVAILABLE_MESSAGE,
  mapSupabaseAuthError,
  NO_ACCOUNT_FOUND_MESSAGE,
} from '@/lib/authErrors'
import {
  checkIdentifierStatus,
  isEmail,
  normalizeIdentifier,
  sendOtp as sendOtpRequest,
  requireSupabase,
  type IdentifierChannel,
} from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { isLoginInProgress } from '@/lib/loginState'
import { useAppDispatch } from '@/hooks/redux'
import { clearCredentials } from '@/features/auth/slices/authSlice'
import { maskIdentifier } from '@/lib/lastAuthMethod'
import { useResendTimer } from '@/hooks/useResendTimer'
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import {
  forgotPasswordSchema,
  forgotPasswordOtpSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ForgotPasswordOtpFormValues,
  type ResetPasswordFormValues,
} from '@/features/auth/validations'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Step = 'identifier' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [step, setStep] = useState<Step>('identifier')
  const [channel, setChannel] = useState<IdentifierChannel>('phone')
  // The canonical identifier (normalized phone/email) carried across steps.
  const [normalized, setNormalized] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const resendTimer = useResendTimer()
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up pending navigation timer + release the login race flag on unmount.
  useEffect(() => {
    return () => {
      if (navigateTimerRef.current !== null) {
        clearTimeout(navigateTimerRef.current)
      }
      isLoginInProgress.current = false
    }
  }, [])

  const identifierForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: '' },
  })
  const otpForm = useForm<ForgotPasswordOtpFormValues>({
    resolver: zodResolver(forgotPasswordOtpSchema),
    defaultValues: { otp: '' },
  })
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  const backToIdentifier = () => {
    // OTP verify may have created a live Supabase session — tear it down so
    // App.tsx does not treat the user as signed in after abandoning the flow.
    isLoginInProgress.current = false
    dispatch(clearCredentials())
    if (supabase) void supabase.auth.signOut()
    setStep('identifier')
    setErrorMessage(null)
    setInfoMessage(null)
    otpForm.reset()
    passwordForm.reset()
    resendTimer.reset()
  }

  // Send (or resend) the 6-digit recovery OTP.
  const sendOtp = async (canonical: string, ch: IdentifierChannel) => {
    requireSupabase()
    await sendOtpRequest(canonical, ch)
    resendTimer.start()
    setInfoMessage(
      ch === 'email'
        ? `We sent a 6-digit code to ${canonical}.`
        : `We sent a 6-digit code via SMS to ${canonical}.`
    )
  }

  const onIdentifierSubmit = async (values: ForgotPasswordFormValues) => {
    requireSupabase()
    setErrorMessage(null)
    setInfoMessage(null)
    setIsSubmitting(true)
    try {
      const raw = values.identifier.trim()
      const detectedChannel: IdentifierChannel = isEmail(raw) ? 'email' : 'phone'
      const status = await checkIdentifierStatus(raw)
      const resolvedChannel = status?.channel ?? detectedChannel
      const canonical = normalizeIdentifier(raw, resolvedChannel)

      setChannel(resolvedChannel)
      setNormalized(canonical)

      if (!status) {
        setErrorMessage(IDENTIFIER_STATUS_UNAVAILABLE_MESSAGE)
        return
      }
      if (!status.exists) {
        setErrorMessage(NO_ACCOUNT_FOUND_MESSAGE)
        return
      }

      await sendOtp(canonical, resolvedChannel)
      otpForm.reset()
      setStep('otp')
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err, 'forgot_password'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onOtpSubmit = async (values: ForgotPasswordOtpFormValues) => {
    const sb = requireSupabase()
    setErrorMessage(null)
    setIsSubmitting(true)
    // Prevent App.tsx SIGNED_IN from auto-logging the user in mid-reset.
    isLoginInProgress.current = true
    let holdLoginFlag = false
    try {
      const result =
        channel === 'email'
          ? await sb.auth.verifyOtp({ email: normalized, token: values.otp, type: 'email' })
          : await sb.auth.verifyOtp({ phone: normalized, token: values.otp, type: 'sms' })
      if (result.error || !result.data.session) {
        throw result.error ?? new Error('Invalid or expired code. Please try again.')
      }
      // Verified — the session is now live; let the user set a new password.
      passwordForm.reset()
      setInfoMessage(null)
      setStep('password')
      holdLoginFlag = true
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err, 'otp'))
    } finally {
      setIsSubmitting(false)
      if (!holdLoginFlag) {
        isLoginInProgress.current = false
      }
    }
  }

  const onPasswordSubmit = async (values: ResetPasswordFormValues) => {
    const sb = requireSupabase()
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const { error } = await sb.auth.updateUser({ password: values.password })
      if (error) throw error
      // End the recovery session so the user must explicitly sign in with the
      // new password (and so Redux does not retain a half-baked login).
      try {
        await sb.auth.signOut()
      } catch {
        /* best-effort */
      }
      dispatch(clearCredentials())
      isLoginInProgress.current = false
      setInfoMessage('Your password has been updated. You can now sign in.')
      navigateTimerRef.current = setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { info: 'Your password has been updated. You can now sign in.' },
        })
      }, 1200)
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err, 'forgot_password'))
    } finally {
      setIsSubmitting(false)
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

  return (
    <div className="min-h-screen flex">
      <AuthBrandingPanel
        title="Reset Password"
        subtitle="Secure account recovery"
        features={['Email or phone verification', '6-digit OTP code', 'Set a new password']}
      />
      <AuthCardLayout
        title="Reset Password"
        subtitle={
          step === 'identifier'
            ? 'Enter your email or phone to get a verification code'
            : step === 'otp'
              ? 'Enter the 6-digit code we sent you'
              : 'Choose a new password'
        }
        errorMessage={errorMessage}
        infoMessage={infoMessage}
        footer={
          <div className="text-center pt-2 text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </div>
        }
      >
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
                      <FormLabel className="text-sm font-medium">Email or phone number</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="email"
                          autoComplete="username"
                          placeholder="you@360ghar.com or +91XXXXXXXXXX"
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
                        Sending code...
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <Form {...otpForm}>
              <form onSubmit={(e) => void otpForm.handleSubmit(onOtpSubmit)(e)} className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Enter the code sent to{' '}
                  <span className="font-medium text-foreground">{maskIdentifier(normalized)}</span>
                </p>
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Verification code</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
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
                      'Verify Code'
                    )}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={backToIdentifier}
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

          {/* Step 3: new password */}
          {step === 'password' && (
            <Form {...passwordForm}>
              <form
                onSubmit={(e) => void passwordForm.handleSubmit(onPasswordSubmit)(e)}
                className="space-y-5"
              >
                <p className="text-sm text-muted-foreground">
                  Setting a new password for{' '}
                  <span className="font-medium text-foreground">{maskIdentifier(normalized)}</span>
                </p>
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">New password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            className="h-11 pl-4 pr-12 text-base"
                            autoFocus
                            {...field}
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
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
                        Updating password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
      </AuthCardLayout>
    </div>
  )
}
