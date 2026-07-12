import { useEffect, useState } from 'react'
import { useGetUserQuery, useUpdateUserMutation, useSendTypedNotificationMutation } from '@/features/users/api/usersApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/hooks/useUserRole'
import AssignAgent from './assign/AssignAgent'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { useGetUserNotificationsQuery } from '@/features/core/api/notificationsApi'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { formatDateTime } from '@/lib/format'
import { userDetailSchema, type UserDetailFormValues } from '@/features/users/validations'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Bell } from 'lucide-react'

const UserDetail = ({ id }: { id: number }) => {
  const skip = !id || Number.isNaN(id)
  const { data, isLoading, isFetching, error, refetch } = useGetUserQuery(id, { skip })
  const [update, updateState] = useUpdateUserMutation()
  const { toast } = useToast()
  const { role } = useUserRole()
  const [sendNotification, sendState] = useSendTypedNotificationMutation()

  const {
    data: notifications,
    isLoading: notificationsLoading,
    isError: notificationsError,
    error: notificationsQueryError,
    refetch: refetchNotifications,
  } = useGetUserNotificationsQuery(id, { skip: skip || role !== 'admin' })
  const notifItems = notifications?.items ?? []

  const [notifType, setNotifType] = useState<string>('promotion_generic')
  const [notifTitle, setNotifTitle] = useState<string>('Message from 360 Ghar')
  const [notifBody, setNotifBody] = useState<string>('')

  const form = useForm<UserDetailFormValues>({
    resolver: zodResolver(userDetailSchema),
    defaultValues: { full_name: '', phone: '', email: '', is_active: true },
  })
  const { reset } = form

  useEffect(() => {
    if (data) {
      reset({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || '',
        is_active: data.is_active ?? true,
      })
    }
  }, [data, reset])

  const onSubmit = async (values: UserDetailFormValues) => {
    form.clearErrors()
    try {
      await update({ id, data: values }).unwrap()
      toast({ title: 'Saved', description: 'User updated' })
    } catch (e: unknown) {
      applyServerValidation(e, form.setError, {
        knownFields: ['full_name', 'phone', 'email', 'is_active'],
      })
      toast({ title: 'Failed', description: getErrorMessage(e, 'Please try again'), variant: 'destructive' })
    }
  }

  const handleSendNotification = async () => {
    if (!notifBody.trim()) {
      toast({ title: 'Message required', description: 'Please enter a message to send.', variant: 'destructive' })
      return
    }
    try {
      await sendNotification({
        userId: id,
        typeKey: notifType,
        title: notifTitle,
        body: notifBody,
      }).unwrap()
      toast({ title: 'Notification sent', description: 'The user will receive this notification shortly.' })
      setNotifBody('')
      void refetchNotifications()
    } catch (e: unknown) {
      toast({
        title: 'Failed to send',
        description: getErrorMessage(e, 'Unable to send notification. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  if (skip) {
    return (
      <EmptyState
        title="Invalid user id"
        description="The URL does not contain a valid user identifier."
      />
    )
  }

  if (error) {
    return <ErrorState title="Failed to load user" error={error} onRetry={() => { void refetch() }} />
  }

  if (isLoading) {
    return <LoadingState type="card" rows={6} />
  }

  if (!data) {
    return (
      <EmptyState
        title="User not found"
        description="This user may have been removed or you may not have access."
      />
    )
  }

  const displayName = data.full_name || data.phone || `User #${data.id}`

  return (
    <div className="space-y-4">
      <PageHeader
        title={displayName}
        breadcrumbs={[
          { label: 'Users', to: '/users' },
          { label: displayName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data.is_active ? 'default' : 'secondary'}>
              {data.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {data.agent?.name || data.agent?.user?.full_name ? (
              <Badge variant="outline">
                Agent: {data.agent?.name || data.agent?.user?.full_name}
              </Badge>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
              <FormRootError form={form} className="md:col-span-2" />
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={updateState.isLoading || isFetching}>
                  {updateState.isLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignAgent
              userId={id}
              currentAgentId={data.agent_id}
              currentAgentLabel={data.agent?.name || data.agent?.user?.full_name}
            />
          </CardContent>
        </Card>
      )}

      {role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Notification type</Label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_confirmed">Booking confirmed</SelectItem>
                    <SelectItem value="payment_failed">Payment failed</SelectItem>
                    <SelectItem value="promotion_generic">Promotion</SelectItem>
                    <SelectItem value="discount_offer">Discount offer</SelectItem>
                    <SelectItem value="visit_reminder">Visit reminder</SelectItem>
                    <SelectItem value="property_recommendation">Property recommendation</SelectItem>
                    <SelectItem value="admin_broadcast">Admin broadcast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Write the message to send to this user…"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => { void handleSendNotification() }}
                disabled={sendState.isLoading}
              >
                {sendState.isLoading ? 'Sending…' : 'Send notification'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {role === 'admin' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Notification History</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { void refetchNotifications() }}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {notificationsError ? (
              <ErrorState
                title="Failed to load notifications"
                error={notificationsQueryError}
                onRetry={() => { void refetchNotifications() }}
              />
            ) : notificationsLoading ? (
              <LoadingState type="skeleton" rows={3} />
            ) : notifItems.length === 0 ? (
              <EmptyState
                icon={<Bell className="h-10 w-10" />}
                title="No notifications"
                description="No notifications have been sent to this user yet."
              />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifItems.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{n.title ?? '—'}</div>
                      {n.created_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDateTime(n.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                      {n.body ?? ''}
                    </p>
                    {n.audience_type && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Audience: {n.audience_type}
                        {n.topic ? ` • topic: ${n.topic}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default UserDetail
