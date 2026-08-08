import * as React from 'react'
import { Input } from '@/components/ui/input'

/**
 * 6-digit OTP field — fixes the attributes every OTP step shares
 * (numeric input mode, one-time-code autofill, 6-char cap); callers keep
 * their own placeholder/className/onChange.
 */
export const OtpInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  (props, ref) => (
    <Input ref={ref} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...props} />
  ),
)
OtpInput.displayName = 'OtpInput'
