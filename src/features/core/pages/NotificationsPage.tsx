import type { ComponentType } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Megaphone, Send, Users2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { useToast } from '@/hooks/use-toast'
import {
  useSendMarketingBroadcastMutation,
  useSendMarketingToSegmentMutation,
} from '@/features/core/api/notificationsApi'
import { useListAllAgentsQuery } from '@/features/agents/api/agentsApi'
import { applyServerValidation } from '@/lib/formErrors'
import { getErrorMessage } from '@/lib/errors'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  MARKETING_TYPES,
  NOTIFICATION_CHANNELS,
  SEGMENT_ROLES,
  notificationComposerDefaults,
  notificationComposerSchema,
  type NotificationChannel,
  type NotificationComposerValues,
  type SegmentRole,
} from '@/features/core/notificationsValidation'
import { isMarketingTypeKey } from '@/features/core/notificationTypes'

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: ComponentType<{ className?: string }>; description: string }> = {
  broadcast: { label: 'Broadcast', icon: Megaphone, description: 'Send to all active users (respects each user’s marketing opt-in).' },
  segment: { label: 'Segment', icon: Users2, description: 'Send to a filtered audience by role and/or assigned agent.' },
}

const ROLE_LABELS: Record<SegmentRole, string> = {
  all: 'All roles',
  user: 'Users',
  agent: 'Agents',
  admin: 'Admins',
}

const NotificationsPage = () => {
  const { toast } = useToast()
  const form = useForm<z.input<typeof notificationComposerSchema>, unknown, NotificationComposerValues>({
    resolver: zodResolver(notificationComposerSchema),
    defaultValues: notificationComposerDefaults,
  })
  const channel = form.watch('channel')
  const agents = useListAllAgentsQuery({ include_inactive: false }, { skip: channel !== 'segment' })

  const [sendBroadcast, broadcastState] = useSendMarketingBroadcastMutation()
  const [sendSegment, segmentState] = useSendMarketingToSegmentMutation()
  const isSending = broadcastState.isLoading || segmentState.isLoading

  const onSubmit = async (values: NotificationComposerValues) => {
    form.clearErrors()
    // The route goes out as `deep_link`, the only key the request schema declares. The backend delivers it as `data.route`.
    const route = values.route?.trim() || undefined
    if (!isMarketingTypeKey(values.typeKey)) return
    try {
      const result = values.channel === 'broadcast'
        ? await sendBroadcast({ typeKey: values.typeKey, title: values.title, body: values.body, deep_link: route }).unwrap()
        : await sendSegment({
            typeKey: values.typeKey,
            title: values.title,
            body: values.body,
            deep_link: route,
            filter: {
              role: values.role && values.role !== 'all' ? values.role : undefined,
              agent_id: values.agentId && values.agentId !== 'all' ? Number(values.agentId) : undefined,
              is_active: true,
            },
          }).unwrap()
      // `succeeded` counts dispatches that reported no error. A user who opted out of marketing is still skipped,
      // and `processed` below `requested` means part of the audience was not sent to. Do not call either "delivered".
      const partial = result.processed < result.requested
      toast({
        title: values.channel === 'broadcast' ? 'Broadcast sent' : 'Segment notification sent',
        description: `Sent to ${formatNumber(result.processed)} of ${formatNumber(result.requested)} users. ${formatNumber(result.succeeded)} dispatched without error.${partial ? ' Part of the audience was not sent to.' : ''}`,
      })
      form.reset({ ...notificationComposerDefaults, channel: values.channel })
    } catch (error) {
      applyServerValidation(error, form.setError, {
        knownFields: ['title', 'body', 'typeKey', 'route'],
        fieldMap: { type_key: 'typeKey', deep_link: 'route' },
      })
      toast({ title: 'Failed to send notification', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Notifications</h1>
        <p className="text-muted-foreground">
          Compose push notifications and marketing messages for app users.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Notification channel"
        className="inline-flex rounded-cohere-pill border border-cohere-hairline p-1"
      >
        {NOTIFICATION_CHANNELS.map((value) => {
          const meta = CHANNEL_META[value]
          const Icon = meta.icon
          const active = channel === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                form.setValue('channel', value)
                form.clearErrors()
              }}
              className={cn(
                'flex items-center gap-2 rounded-cohere-pill px-4 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {meta.label}
            </button>
          )
        })}
      </div>

      <Card className="rounded-cohere-md border-cohere-card-border">
        <CardHeader>
          <CardTitle>{CHANNEL_META[channel].label}</CardTitle>
          <CardDescription>{CHANNEL_META[channel].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
              <FormRootError form={form} />

              {channel === 'segment' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audience role</FormLabel>
                        <Select value={field.value ?? 'all'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEGMENT_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned agent (optional)</FormLabel>
                        <Select value={field.value ?? 'all'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All agents" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All agents</SelectItem>
                            {(agents.data ?? []).map((agent) => (
                              <SelectItem key={agent.id} value={String(agent.id)}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {agents.error && (
                    <p role="alert" className="text-sm text-destructive md:col-span-2">
                      Could not load agents for this filter. <Button type="button" variant="link" size="sm" onClick={() => { void agents.refetch() }}>Retry</Button>
                    </p>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="typeKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARKETING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Notification title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Write the message users will see…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. /property/123" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>The app screen the push opens. Leave empty to open the app as is.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSending} className="rounded-cohere-pill">
                  <Send className="h-4 w-4" />
                  {isSending ? 'Sending…' : `Send ${CHANNEL_META[channel].label.toLowerCase()}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationsPage
