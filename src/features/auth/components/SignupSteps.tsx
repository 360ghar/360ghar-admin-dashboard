import type { SubmitHandler, UseFormReturn } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { OtpInput } from '@/components/auth/OtpInput'
import type { ResendTimer } from '@/hooks/useResendTimer'
import type { SignupFormValues, OtpStepFormValues, SetPasswordStepFormValues } from '../validations'

export function SignupRegistrationStep({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: UseFormReturn<SignupFormValues>
  onSubmit: SubmitHandler<SignupFormValues>
  isSubmitting: boolean
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <FormField control={form.control} name="full_name" render={({ field }) => (
          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" autoComplete="name" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" inputMode="email" autoComplete="username" placeholder="you@example.com" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+91XXXXXXXXXX" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="terms_accepted" render={({ field }) => (
          <FormItem className="space-y-2">
            <div className="flex items-start gap-2">
              <FormControl><Checkbox id="terms_accepted" className="mt-0.5" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel htmlFor="terms_accepted" className="text-sm font-normal leading-snug text-muted-foreground">
                I agree to the{' '}
                <a href="https://360ghar.com/policies/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms &amp; Conditions</a>{' '}
                and{' '}
                <a href="https://360ghar.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>
              </FormLabel>
            </div>
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

export function SignupOtpStep({
  form,
  onSubmit,
  isSubmitting,
  onBack,
  onResend,
  resendTimer,
}: {
  form: UseFormReturn<OtpStepFormValues>
  onSubmit: SubmitHandler<OtpStepFormValues>
  isSubmitting: boolean
  onBack: () => void
  onResend: () => void
  resendTimer: ResendTimer
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <FormField control={form.control} name="otp" render={({ field }) => (
          <FormItem>
            <FormLabel>6-Digit Code</FormLabel>
            <FormControl>
              <OtpInput placeholder="Enter the code" className="h-11 text-center text-lg tracking-widest" autoFocus {...field} onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button type="submit" className="h-11 flex-1 text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Verifying...</> : 'Verify Code'}
          </Button>
        </div>
        <div className="text-center text-sm">
          <button type="button" onClick={onResend} disabled={isSubmitting || !resendTimer.canResend} className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:opacity-50">
            {resendTimer.isActive ? `Resend code in ${resendTimer.secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </Form>
  )
}

export function SignupPasswordStep({
  form,
  onSubmit,
  isSubmitting,
  onBack,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
}: {
  form: UseFormReturn<SetPasswordStepFormValues>
  onSubmit: SubmitHandler<SetPasswordStepFormValues>
  isSubmitting: boolean
  onBack: () => void
  showPassword: boolean
  showConfirmPassword: boolean
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-5">
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormLabel>Password</FormLabel><FormControl><PasswordInput show={showPassword} onToggleShow={onTogglePassword} autoComplete="new-password" placeholder="Create a password" className="h-11" {...field} /></FormControl><FormDescription>Use at least 8 characters, one uppercase letter, and one number.</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="confirm_password" render={({ field }) => (
          <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><PasswordInput show={showConfirmPassword} onToggleShow={onToggleConfirmPassword} autoComplete="new-password" placeholder="Re-enter password" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button type="submit" className="h-11 flex-1 text-base font-medium" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Setting up...</> : 'Create Account'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
