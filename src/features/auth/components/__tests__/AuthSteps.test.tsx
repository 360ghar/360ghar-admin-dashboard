import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { LoginPasswordStep } from '../LoginSteps'
import { SignupRegistrationStep } from '../SignupSteps'
import { RecoveryPasswordStep } from '../ForgotPasswordSteps'
import {
  passwordStepSchema,
  signupSchema,
  resetPasswordSchema,
  type PasswordStepFormValues,
  type SignupFormValues,
  type ResetPasswordFormValues,
} from '../../validations'

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterAll(() => vi.unstubAllGlobals())

it('keeps the password after a failed login submission', async () => {
  function Harness() {
    const form = useForm<PasswordStepFormValues>({ resolver: zodResolver(passwordStepSchema), defaultValues: { password: '' } })
    const [failed, setFailed] = useState(false)
    return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LoginPasswordStep form={form} onSubmit={() => { setFailed(true) }} isSubmitting={false} identifier="agent@example.com" showPassword={false} onTogglePassword={() => {}} onBack={() => {}} />
      {failed && <p>Sign-in failed</p>}
    </MemoryRouter>
  }
  render(<Harness />)
  fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'existing-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
  expect(await screen.findByText('Sign-in failed')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Enter your password')).toHaveValue('existing-password')
})

it('keeps registration fields after a failed OTP request', async () => {
  function Harness() {
    const form = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema), defaultValues: { full_name: '', email: '', phone: '', terms_accepted: false } })
    const [failed, setFailed] = useState(false)
    return <>
      <SignupRegistrationStep form={form} onSubmit={() => { setFailed(true) }} isSubmitting={false} />
      {failed && <p>Could not send code</p>}
    </>
  }
  render(<Harness />)
  fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Priya Singh' } })
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'priya@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('+91XXXXXXXXXX'), { target: { value: '+919876543210' } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }))
  expect(await screen.findByText('Could not send code')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('priya@example.com')
  expect(screen.getByRole('checkbox')).toBeChecked()
})

it('keeps a valid new password after a failed recovery request', async () => {
  function Harness() {
    const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirm_password: '' } })
    const [failed, setFailed] = useState(false)
    return <>
      <RecoveryPasswordStep form={form} onSubmit={() => { setFailed(true) }} isSubmitting={false} identifier="priya@example.com" showPassword={false} onTogglePassword={() => {}} />
      {failed && <p>Could not update password</p>}
    </>
  }
  render(<Harness />)
  fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'Password1' } })
  fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), { target: { value: 'Password1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
  expect(await screen.findByText('Could not update password')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Enter new password')).toHaveValue('Password1')
})
