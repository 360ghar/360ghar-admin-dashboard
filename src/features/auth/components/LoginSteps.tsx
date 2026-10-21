import type { SubmitHandler, UseFormReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GoogleIcon } from '@/components/ui/google-icon'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { OtpInput } from '@/components/auth/OtpInput'
import { maskIdentifier, type LastAuthMethod } from '@/lib/lastAuthMethod'
import type { ResendTimer } from '@/hooks/useResendTimer'
import type { AuthMethod } from '@/lib/auth'
import type { IdentifierFormValues, PasswordStepFormValues, OtpStepFormValues, SetPasswordStepFormValues } from '../validations'

const METHOD_LABELS: Record<AuthMethod, string> = {
  google: 'Google',
  apple: 'Apple',
  email_password: 'email & password',
  phone_password: 'phone & password',
  phone_otp: 'phone OTP',
  email_otp: 'email OTP',
}

export function LoginIdentifierStep({
  form, onSubmit, isSubmitting, lastMethod, googleLoading, onGoogle,
}: {
  form: UseFormReturn<IdentifierFormValues>
  onSubmit: SubmitHandler<IdentifierFormValues>
  isSubmitting: boolean
  lastMethod: LastAuthMethod | null
  googleLoading: boolean
  onGoogle: () => void
}) {
  return (
    <>
      {lastMethod && (
        <p className="text-center text-sm text-muted-foreground">
          Last time you signed in with <span className="font-medium text-foreground">{METHOD_LABELS[lastMethod.method]}</span>
          {lastMethod.identifierHint ? ` (${lastMethod.identifierHint})` : ''}.
        </p>
      )}
      <Button type="button" variant="outline" className="h-11 w-full gap-2 text-base font-medium" onClick={onGoogle} disabled={googleLoading || isSubmitting} aria-busy={googleLoading}>
        {googleLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <GoogleIcon className="h-5 w-5" />}
        Sign in with Google
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
      </div>
      <Form {...form}>
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
          <FormField control={form.control} name="identifier" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Phone number or email</FormLabel>
              <FormControl><Input type="text" inputMode="text" autoComplete="username" placeholder="+91XXXXXXXXXX or you@360ghar.com" className="h-11 px-4 text-base" autoFocus {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Checking...</> : 'Continue'}
          </Button>
        </form>
      </Form>
      <div className="flex items-center justify-between pt-2 text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <Link to="/signup" className="text-primary hover:underline">New agent? Sign up</Link>
      </div>
    </>
  )
}

export function LoginPasswordStep({
  form, onSubmit, isSubmitting, identifier, showPassword, onTogglePassword, onBack,
}: {
  form: UseFormReturn<PasswordStepFormValues>
  onSubmit: SubmitHandler<PasswordStepFormValues>
  isSubmitting: boolean
  identifier: string
  showPassword: boolean
  onTogglePassword: () => void
  onBack: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <p className="text-sm text-muted-foreground">Signing in as <span className="font-medium text-foreground">{identifier}</span></p>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><PasswordInput show={showPassword} onToggleShow={onTogglePassword} autoComplete="current-password" placeholder="Enter your password" className="h-11 pl-4 text-base" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Signing in...</> : 'Sign In'}
        </Button>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={onBack} disabled={isSubmitting} className="flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Use a different account</button>
          <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </div>
      </form>
    </Form>
  )
}

export function LoginOtpStep({
  form, onSubmit, isSubmitting, identifier, onBack, onResend, resendTimer,
}: {
  form: UseFormReturn<OtpStepFormValues>
  onSubmit: SubmitHandler<OtpStepFormValues>
  isSubmitting: boolean
  identifier: string
  onBack: () => void
  onResend: () => void
  resendTimer: ResendTimer
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <p className="text-sm text-muted-foreground">Enter the code sent to <span className="font-medium text-foreground">{identifier}</span></p>
        <FormField control={form.control} name="otp" render={({ field }) => (
          <FormItem><FormLabel>Verification code</FormLabel><FormControl><OtpInput placeholder="123456" className="h-11 px-4 text-center text-base tracking-[0.5em]" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Verifying...</> : 'Verify & Sign In'}
        </Button>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={onBack} disabled={isSubmitting} className="flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back</button>
          <button type="button" onClick={onResend} disabled={isSubmitting || !resendTimer.canResend} className="text-primary hover:underline disabled:no-underline disabled:opacity-50">
            {resendTimer.isActive ? `Resend code in ${resendTimer.secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </Form>
  )
}

export function LoginSetPasswordStep({
  form, onSubmit, isSubmitting, identifier, showPassword, onTogglePassword, onAbandon,
}: {
  form: UseFormReturn<SetPasswordStepFormValues>
  onSubmit: SubmitHandler<SetPasswordStepFormValues>
  isSubmitting: boolean
  identifier: string
  showPassword: boolean
  onTogglePassword: () => void
  onAbandon: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Setting a password for <span className="font-medium text-foreground">{maskIdentifier(identifier)}</span>.
          Your account doesn&apos;t have one yet — set it to finish signing in and use it next time.
        </p>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>New password</FormLabel><FormControl><PasswordInput show={showPassword} onToggleShow={onTogglePassword} autoComplete="new-password" placeholder="Create a password" className="h-11 pl-4 text-base" autoFocus {...field} /></FormControl><FormDescription>Use at least 8 characters, one uppercase letter, and one number.</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="confirm_password" render={({ field }) => (
          <FormItem><FormLabel>Confirm password</FormLabel><FormControl><Input type="password" autoComplete="new-password" placeholder="Re-enter password" className="h-11 px-4 text-base" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Saving...</> : 'Set Password & Continue'}
        </Button>
        <div className="text-center"><button type="button" onClick={onAbandon} disabled={isSubmitting} className="text-sm text-muted-foreground hover:underline disabled:opacity-50">This isn&apos;t my account</button></div>
      </form>
    </Form>
  )
}
