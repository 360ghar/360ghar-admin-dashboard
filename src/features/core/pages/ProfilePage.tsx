import React, { useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { setCredentials } from '@/features/auth/slices/authSlice'
import { useUserRole } from '@/hooks/useUserRole'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUpdateUserMutation } from '@/features/users/api/usersApi'
import { useUploadFileMutation } from '@/features/core/api/uploadApi'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { User, Mail, Phone, Calendar, MapPin, Shield, CheckCircle, Camera } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { profileSchema, type ProfileFormValues } from '@/features/core/validations'

const AdminPrivilegesCard = () => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Administrator Privileges</CardTitle></CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[{ icon: User, title: 'User Management', desc: 'Full access to manage all users and their accounts' }, { icon: User, title: 'Agent Oversight', desc: 'Manage agents and their property assignments' }, { icon: MapPin, title: 'Property Control', desc: 'Complete control over all properties in the system' }, { icon: Calendar, title: 'Visit Management', desc: 'Oversee all scheduled visits and bookings' }, { icon: CheckCircle, title: 'Booking System', desc: 'Manage all property bookings and confirmations' }, { icon: Shield, title: 'Analytics Access', desc: 'View comprehensive system analytics and reports' }].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-4 rounded-cohere-md border border-cohere-card-border bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-primary/10 rounded-full"><Icon className="h-4 w-4 text-primary" /></div><h4 className="font-medium">{title}</h4></div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const ProfilePage = () => {
  const { user: me, role } = useUserRole()
  const dispatch = useAppDispatch()
  const authToken = useAppSelector((state) => state.auth.token)
  const { toast } = useToast()
  const form = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: '', phone: '', email: '' } })
  const [updateUser, updateState] = useUpdateUserMutation()
  const [uploadFile, uploadState] = useUploadFileMutation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !me?.id) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.', variant: 'destructive' })
      return
    }
    setIsUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploaded = await uploadFile(fd).unwrap()
      const updatedUser = await updateUser({ id: me.id, data: { profile_image_url: uploaded.public_url } }).unwrap()
      dispatch(setCredentials({ token: authToken, user: updatedUser }))
      toast({ title: 'Avatar updated' })
    } catch (error: unknown) {
      toast({ title: 'Upload failed', description: getErrorMessage(error, 'Could not update avatar. Please try again.'), variant: 'destructive' })
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  React.useEffect(() => {
    if (me && 'id' in me) form.reset({ full_name: me.full_name || '', phone: me.phone || '', email: me.email || '' })
  }, [me, form])

  const onSubmit = async (values: ProfileFormValues) => {
    form.clearErrors()
    try {
      if (!me?.id) { toast({ title: 'Update Failed', description: 'User information is unavailable.', variant: 'destructive' }); return }
      const user = await updateUser({ id: me.id, data: values }).unwrap()
      dispatch(setCredentials({ token: authToken, user }))
      toast({ title: "Profile Updated", description: "Your profile information has been successfully updated." })
    } catch (error: unknown) { applyServerValidation(error, form.setError); toast({ title: "Update Failed", description: getErrorMessage(error, "Failed to update profile. Please try again."), variant: "destructive" }) }
  }

  const isFormDirty = form.formState.isDirty

  return (
    <div className="space-y-8">
      <PageHeader title="My Profile" description="Manage your account information, security settings, and preferences." />
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile Overview</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {me?.profile_image_url ? <AvatarImage src={me.profile_image_url} alt={me?.full_name ?? 'avatar'} /> : null}
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">{me?.full_name ? me.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handleAvatarChange(e)} className="hidden" aria-hidden="true" />
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full ring-2 ring-background"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar || uploadState.isLoading}
                  aria-label="Change avatar"
                >
                  {isUploadingAvatar ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-center"><h3 className="text-xl font-semibold">{me?.full_name || 'N/A'}</h3>
                <div className="flex items-center justify-center gap-2 mt-2"><Badge variant={role === 'admin' ? 'default' : 'secondary'} className="px-3 py-1">{role === 'admin' ? <><Shield className="h-3 w-3 mr-1" />Administrator</> : <><User className="h-3 w-3 mr-1" />Agent</>}</Badge></div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4"><h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Contact Information</h4>
              <div className="space-y-3">
                {[{ icon: Mail, label: 'Email', value: me?.email || 'Not provided' }, { icon: Phone, label: 'Phone', value: me?.phone || 'Not provided' }, { icon: Calendar, label: 'User ID', value: `#${me?.id}`, mono: true }, ...(role === 'agent' ? [{ icon: MapPin, label: 'Agent ID', value: `#${me?.agent_id}`, mono: true }] : [])].map(({ icon: Icon, label, value, mono }) => (
                  <div key={label} className="flex items-center space-x-3 p-3 rounded-cohere-md border border-cohere-card-border bg-card/60 backdrop-blur-md">
                    <div className="p-2 bg-primary/10 rounded-full"><Icon className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-sm font-medium ${mono ? 'font-mono' : 'truncate'}`}>{value}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Edit Profile Information</CardTitle></CardHeader>
          <CardContent><Form {...form}><form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            <FormRootError form={form} />
            <div className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel className="text-sm font-medium">Full Name</FormLabel><FormControl><Input placeholder="Enter your full name" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel className="text-sm font-medium">Phone Number</FormLabel><FormControl><Input placeholder="Enter your phone number" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-sm font-medium">Email Address</FormLabel><FormControl><Input type="email" placeholder="Enter your email address" className="h-11" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">{isFormDirty && "You have unsaved changes"}</div>
              <div className="flex gap-3">
                {isFormDirty && <Button type="button" variant="outline" onClick={() => form.reset()}>Cancel</Button>}
                <Button type="submit" disabled={updateState.isLoading || !isFormDirty} className="min-w-[120px]">{updateState.isLoading ? <><LoadingSpinner size="sm" className="mr-2 inline-flex" />Saving...</> : <><CheckCircle className="mr-2 h-4 w-4" />Save Changes</>}</Button>
              </div>
            </div>
          </form></Form></CardContent>
        </Card>
      </div>
      {role === 'admin' && <AdminPrivilegesCard />}
    </div>
  )
}

export default ProfilePage
