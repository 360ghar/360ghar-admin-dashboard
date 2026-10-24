import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UseFormReturn } from 'react-hook-form'
import type { UserProfileFormInput, UserProfileFormValues } from '@/features/users/validations'
import { FormRootError } from '@/components/ui/form-root-error'

interface ProfileTabProps {
  profileForm: UseFormReturn<UserProfileFormInput, unknown, UserProfileFormValues>
  /** Shown read-only: email changes go through the sign-in provider, not the profile save. */
  email?: string | null
  onSubmit: (e: React.FormEvent) => void
  updating: boolean
}

const ProfileTab: React.FC<ProfileTabProps> = ({ profileForm, email, onSubmit, updating }) => (
  <Card>
    <CardHeader>
      <CardTitle>Profile Information</CardTitle>
      <CardDescription>Update your personal information</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormRootError form={profileForm} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...profileForm.register('full_name')} placeholder="Enter your full name" />
            {profileForm.formState.errors.full_name && (
              <p className="text-sm text-destructive">{profileForm.formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email ?? ''} readOnly disabled placeholder="No email on file" />
            <p className="text-xs text-muted-foreground">Email is managed by your sign-in provider.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...profileForm.register('phone')} placeholder="Enter your phone number" />
            {profileForm.formState.errors.phone && (
              <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" type="date" {...profileForm.register('date_of_birth')} />
            {profileForm.formState.errors.date_of_birth && (
              <p className="text-sm text-destructive">{profileForm.formState.errors.date_of_birth.message}</p>
            )}
          </div>
        </div>
        <Button type="submit" disabled={updating}>
          {updating ? 'Updating...' : 'Save Changes'}
        </Button>
      </form>
    </CardContent>
  </Card>
)

export default ProfileTab
