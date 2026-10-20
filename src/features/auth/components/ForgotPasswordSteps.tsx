import type { SubmitHandler, UseFormReturn } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { OtpInput } from '@/components/auth/OtpInput'
import { maskIdentifier } from '@/lib/lastAuthMethod'
import type { ResendTimer } from '@/hooks/useResendTimer'
import type { ForgotPasswordFormValues, ForgotPasswordOtpFormValues, ResetPasswordFormValues } from '../validations'

export function RecoveryIdentifierStep({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: UseFormReturn<ForgotPasswordFormValues>
  onSubmit: SubmitHandler<ForgotPasswordFormValues>
  isSubmitting: boolean
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <FormField control={form.control} name="identifier" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Email or phone number</FormLabel>
            <FormControl>
              <Input type="text" inputMode="email" autoComplete="username" placeholder="you@360ghar.com or +91XXXXXXXXXX" className="h-11 px-4 text-base" autoFocus {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Sending code...</> : 'Send Verification Code'}
        </Button>
      </form>
    </Form>
  )
}

export function RecoveryOtpStep({
  form,
  onSubmit,
  isSubmitting,
  identifier,
  resendTimer,
  onBack,
  onResend,
}: {
  form: UseFormReturn<ForgotPasswordOtpFormValues>
  onSubmit: SubmitHandler<ForgotPasswordOtpFormValues>
  isSubmitting: boolean
  identifier: string
  resendTimer: ResendTimer
  onBack: () => void
  onResend: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <p className="text-sm text-muted-foreground">Enter the code sent to <span className="font-medium text-foreground">{maskIdentifier(identifier)}</span></p>
        <FormField control={form.control} name="otp" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Verification code</FormLabel>
            <FormControl><OtpInput placeholder="123456" className="h-11 px-4 text-center text-base tracking-[0.5em]" autoFocus {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Verifying...</> : 'Verify Code'}
        </Button>
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="gap-1 px-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <button type="button" onClick={onResend} disabled={isSubmitting || !resendTimer.canResend} className="text-primary hover:underline disabled:no-underline disabled:opacity-50">
            {resendTimer.isActive ? `Resend code in ${resendTimer.secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </Form>
  )
}

export function RecoveryPasswordStep({
  form,
  onSubmit,
  isSubmitting,
  identifier,
  showPassword,
  onTogglePassword,
}: {
  form: UseFormReturn<ResetPasswordFormValues>
  onSubmit: SubmitHandler<ResetPasswordFormValues>
  isSubmitting: boolean
  identifier: string
  showPassword: boolean
  onTogglePassword: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <p className="text-sm text-muted-foreground">Setting a new password for <span className="font-medium text-foreground">{maskIdentifier(identifier)}</span></p>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">New password</FormLabel>
            <FormControl><PasswordInput show={showPassword} onToggleShow={onTogglePassword} autoComplete="new-password" placeholder="Enter new password" className="h-11 pl-4 text-base" autoFocus {...field} /></FormControl>
            <FormDescription>Use at least 8 characters, one uppercase letter, and one number.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="confirm_password" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
            <FormControl><Input type="password" autoComplete="new-password" placeholder="Re-enter new password" className="h-11 px-4 text-base" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Updating password...</> : 'Update Password'}
        </Button>
      </form>
    </Form>
  )
}

export function RecoveryFooter() {
  return <div className="pt-2 text-center text-sm text-muted-foreground">Remembered your password? <Link to="/login" className="text-primary hover:underline">Back to login</Link></div>
}
