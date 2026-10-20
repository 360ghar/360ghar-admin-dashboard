import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { supabase } from '@/lib/supabase'
import { mapSupabaseAuthError } from '@/lib/authErrors'
import { fetchUserProfileWithStatus, OAUTH_CALLBACK_URL, requireSupabase } from '@/lib/auth'
import { isLoginInProgress } from '@/lib/loginState'
import { useAppDispatch } from '@/hooks/redux'
import { clearCredentials, setCredentials } from '@/features/auth/slices/authSlice'
import { signupSchema, otpStepSchema, setPasswordStepSchema, type SignupFormValues, type OtpStepFormValues, type SetPasswordStepFormValues } from '@/features/auth/validations'
import { useResendTimer } from '@/hooks/useResendTimer'

import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import { SignupOtpStep, SignupPasswordStep, SignupRegistrationStep } from '../components/SignupSteps'

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // OTP flow state
  const [step, setStep] = useState<'form' | 'otp' | 'setPassword'>('form')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const signupDataRef = useRef<SignupFormValues | null>(null)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: '', email: '', phone: '', terms_accepted: false },
  })

  const otpForm = useForm<OtpStepFormValues>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { otp: '' },
  })

  const passwordForm = useForm<SetPasswordStepFormValues>({
    resolver: zodResolver(setPasswordStepSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  // 30s cooldown for the "Resend code" control on the OTP step.
  const resendTimer = useResendTimer()

  // Never leave the App.tsx race flag stuck if the user leaves mid-signup.
  useEffect(() => {
    return () => {
      isLoginInProgress.current = false
    }
  }, [])

  const onSubmit = async (values: SignupFormValues) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      await sendSignupOtp(values)

      signupDataRef.current = values
      setStep('otp')
      setSuccessMessage(
        'We sent a 6-digit verification code to your email. Please enter it below.'
      )
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send (or resend) the 6-digit email OTP via signInWithOtp (creates user
  // without password). Starts the 30s resend cooldown on success.
  const sendSignupOtp = async (values: SignupFormValues) => {
    const sb = requireSupabase()
    const { error } = await sb.auth.signInWithOtp({
      email: values.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: OAUTH_CALLBACK_URL,
        data: {
          full_name: values.full_name,
          phone: values.phone,
        },
      },
    })
    if (error) throw error
    resendTimer.start()
  }

  const handleResendOtp = async () => {
    if (!signupDataRef.current || !resendTimer.canResend) return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await sendSignupOtp(signupDataRef.current)
      setSuccessMessage('We sent a new 6-digit verification code to your email.')
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpSubmit = async (values: OtpStepFormValues) => {
    if (!signupDataRef.current) return
    const code = values.otp.replace(/\D/g, '')

    setErrorMessage(null)
    setIsSubmitting(true)
    // Block App.tsx from auto-setting credentials mid signup set-password.
    isLoginInProgress.current = true
    let holdLoginFlag = false

    try {
      const sb = requireSupabase()
      const { data, error } = await sb.auth.verifyOtp({
        email: signupDataRef.current.email,
        token: code,
        type: 'email',
      })
      if (error) throw error
      if (!data.session) {
        setErrorMessage('Verification failed. Please try again.')
        return
      }

      // OTP verified — move to set-password step.
      setStep('setPassword')
      setSuccessMessage(null)
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

  const handleSetPassword = async (values: SetPasswordStepFormValues) => {
    if (!signupDataRef.current) return

    setErrorMessage(null)
    setIsSubmitting(true)
    isLoginInProgress.current = true

    try {
      const sb = requireSupabase()
      // Set the password while the session is live.
      const { error } = await sb.auth.updateUser({ password: values.password })
      if (error) throw error

      const { data: sessionData } = await sb.auth.getSession()
      const session = sessionData.session
      const accessToken = session?.access_token
      if (!session || !accessToken) {
        setErrorMessage('Session expired. Please sign in.')
        isLoginInProgress.current = false
        return
      }

      const { user, status } = await fetchUserProfileWithStatus(accessToken, session.user.id)
      if (user?.is_active && (user.role === 'admin' || user.role === 'agent')) {
        dispatch(setCredentials({ token: accessToken, user }))
        isLoginInProgress.current = false
        navigate('/dashboard', { replace: true })
      } else {
        // Profile not yet provisioned (404) or backend unreachable (transient).
        // Either way, leave the half-logged-in state — sign out of Supabase so
        // the user can retry cleanly from the login page.
        try {
          await sb.auth.signOut()
        } catch {
          /* best-effort */
        }
        dispatch(clearCredentials())
        isLoginInProgress.current = false
        navigate('/login', {
          replace: true,
          state: {
            info:
              status === 404
                ? 'Account created! Your profile is being provisioned. Please try signing in shortly.'
                : 'Could not verify your account. Please try signing in again.',
          },
        })
      }
    } catch (err) {
      setErrorMessage(mapSupabaseAuthError(err))
      // Keep flag held while still on setPassword with a live session.
    } finally {
      setIsSubmitting(false)
    }
  }

  const backToForm = () => {
    isLoginInProgress.current = false
    dispatch(clearCredentials())
    if (supabase) void supabase.auth.signOut()
    setStep('form')
    otpForm.reset()
    passwordForm.reset()
    setErrorMessage(null)
    setSuccessMessage(null)
    resendTimer.reset()
  }

  const backToOtp = () => {
    // Stay mid-flow with live session; keep isLoginInProgress held.
    passwordForm.reset()
    setStep('otp')
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  return (
    <div className="min-h-screen flex">
      <AuthBrandingPanel
        title="Become a 360Ghar Agent"
        subtitle="Join the agent portal"
        features={[
          'Manage assigned users and properties',
          'Seamless coordination with admins',
          'Real-time bookings and visits',
        ]}
      />
      <AuthCardLayout
        title={step === 'form' ? 'Agent Sign Up' : step === 'otp' ? 'Verify Your Email' : 'Set Password'}
        subtitle={step === 'form' ? 'Create your agent account' : step === 'otp' ? 'Enter the 6-digit code sent to your email' : 'Choose a strong password for your account'}
        errorMessage={errorMessage}
        infoMessage={successMessage}
        footer={<div className="pt-2 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></div>}
      >
        {step === 'form' && <SignupRegistrationStep form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />}
        {step === 'otp' && (
          <SignupOtpStep
            form={otpForm}
            onSubmit={handleOtpSubmit}
            isSubmitting={isSubmitting}
            onBack={backToForm}
            onResend={() => void handleResendOtp()}
            resendTimer={resendTimer}
          />
        )}
        {step === 'setPassword' && (
          <SignupPasswordStep
            form={passwordForm}
            onSubmit={handleSetPassword}
            isSubmitting={isSubmitting}
            onBack={backToOtp}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
          />
        )}
      </AuthCardLayout>
    </div>
  )
}
