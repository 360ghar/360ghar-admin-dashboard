import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel'
import { AuthCardLayout } from '@/components/auth/AuthCardLayout'
import { LoginIdentifierStep, LoginOtpStep, LoginPasswordStep, LoginSetPasswordStep } from '../components/LoginSteps'
import { useLoginFlow } from '../hooks/useLoginFlow'

const LoginPage = () => {
  const {
    step, errorMessage, infoMessage, lastMethod,
    identifierForm, onIdentifierSubmit, isSubmitting, googleLoading, handleGoogle,
    passwordForm, onPasswordSubmit, displayIdentifier, showPassword, setShowPassword, resetToIdentifier,
    otpForm, onOtpSubmit, handleResendOtp, resendTimer,
    setPasswordForm, onSetPasswordSubmit, normalized, abandonSetPassword,
  } = useLoginFlow()

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
        footer={step === 'identifier' ? <p className="pt-4 text-center text-sm text-muted-foreground">Secure access to 360Ghar Admin Portal</p> : undefined}
      >
        {step === 'identifier' && (
          <LoginIdentifierStep
            form={identifierForm}
            onSubmit={onIdentifierSubmit}
            isSubmitting={isSubmitting}
            lastMethod={lastMethod}
            googleLoading={googleLoading}
            onGoogle={() => void handleGoogle()}
          />
        )}
        {step === 'password' && (
          <LoginPasswordStep
            form={passwordForm}
            onSubmit={onPasswordSubmit}
            isSubmitting={isSubmitting}
            identifier={displayIdentifier}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onBack={resetToIdentifier}
          />
        )}
        {step === 'otp' && (
          <LoginOtpStep
            form={otpForm}
            onSubmit={onOtpSubmit}
            isSubmitting={isSubmitting}
            identifier={displayIdentifier}
            onBack={resetToIdentifier}
            onResend={() => void handleResendOtp()}
            resendTimer={resendTimer}
          />
        )}
        {step === 'set-password' && (
          <LoginSetPasswordStep
            form={setPasswordForm}
            onSubmit={onSetPasswordSubmit}
            isSubmitting={isSubmitting}
            identifier={normalized || displayIdentifier}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onAbandon={abandonSetPassword}
          />
        )}
      </AuthCardLayout>
    </div>
  )
}

export default LoginPage
