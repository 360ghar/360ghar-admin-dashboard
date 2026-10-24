import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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

import { RecoveryFooter, RecoveryIdentifierStep, RecoveryOtpStep, RecoveryPasswordStep } from '../components/ForgotPasswordSteps'

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
        void navigate('/login', {
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
        subtitle={step === 'identifier' ? 'Enter your email or phone to get a verification code' : step === 'otp' ? 'Enter the 6-digit code we sent you' : 'Choose a new password'}
        errorMessage={errorMessage}
        infoMessage={infoMessage}
        footer={<RecoveryFooter />}
      >
        {step === 'identifier' && <RecoveryIdentifierStep form={identifierForm} onSubmit={onIdentifierSubmit} isSubmitting={isSubmitting} />}
        {step === 'otp' && (
          <RecoveryOtpStep
            form={otpForm}
            onSubmit={onOtpSubmit}
            isSubmitting={isSubmitting}
            identifier={normalized}
            resendTimer={resendTimer}
            onBack={backToIdentifier}
            onResend={() => void handleResendOtp()}
          />
        )}
        {step === 'password' && (
          <RecoveryPasswordStep
            form={passwordForm}
            onSubmit={onPasswordSubmit}
            isSubmitting={isSubmitting}
            identifier={normalized}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
          />
        )}
      </AuthCardLayout>
    </div>
  )
}
