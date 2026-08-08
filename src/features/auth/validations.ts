import { z } from 'zod'

// --- Login state-machine schemas ---

// Step 1: identifier (phone or email) entry
export const identifierSchema = z.object({
  identifier: z.string().min(3, 'Enter your phone number or email'),
})

// Step 2a: password (verified accounts — login only).
// Do NOT enforce complexity here: login must accept any existing password.
// Complexity rules belong on set-password / reset-password schemas.
export const passwordStepSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

// 6-digit OTP verification — shared by login (unverified/OTP-first accounts)
// and the forgot-password phone channel (aliased below as forgotPasswordOtpSchema).
export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'Enter the 6-digit code')
    .max(6, 'Enter the 6-digit code')
    .regex(/^\d{6}$/, 'The code must be 6 digits'),
})
export const otpStepSchema = otpSchema

// New-password entry with complexity rules — shared by the mandatory
// set-password step after OTP and the reset-password flow (aliased below as
// resetPasswordSchema).
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
export const setPasswordStepSchema = newPasswordSchema

export type IdentifierFormValues = z.infer<typeof identifierSchema>
export type PasswordStepFormValues = z.infer<typeof passwordStepSchema>
export type OtpStepFormValues = z.infer<typeof otpStepSchema>
export type SetPasswordStepFormValues = z.infer<typeof setPasswordStepSchema>

// Signup form validation schema (OTP-based: password is set after verification)
export const signupSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z
    .string()
    .min(8, 'Phone number is required')
    .regex(/^[0-9+\-()\s]+$/, 'Enter a valid phone number'),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms & Conditions',
  }),
})

// Forgot password form validation schema — accepts email or phone
export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or phone number'),
})

// Forgot password OTP step (phone channel only)
export const forgotPasswordOtpSchema = otpSchema

// Reset password form validation schema
export const resetPasswordSchema = newPasswordSchema

// Export inferred types
export type SignupFormValues = z.infer<typeof signupSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ForgotPasswordOtpFormValues = z.infer<typeof forgotPasswordOtpSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
