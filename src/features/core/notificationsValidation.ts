import { z } from 'zod'
import { MARKETING_TYPE_KEYS, MARKETING_TYPE_LABELS, isMarketingTypeKey } from './notificationTypes'

// The topic channel is gone: the backend answers 409 TOPIC_CHANNEL_DISABLED and no app subscribes to a topic.
export const NOTIFICATION_CHANNELS = ['broadcast', 'segment'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const SEGMENT_ROLES = ['all', 'user', 'agent', 'admin'] as const
export type SegmentRole = (typeof SEGMENT_ROLES)[number]

export const MARKETING_TYPES = MARKETING_TYPE_KEYS.map((value) => ({ value, label: MARKETING_TYPE_LABELS[value] }))

/** A push route: an app route such as `/property/123`, or an https link. */
export const isPushRoute = (value: string) => /^\/[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value)

export const notificationComposerSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS),
  typeKey: z.string().refine(isMarketingTypeKey, 'Select a notification type'),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Keep the title under 120 characters'),
  body: z.string().trim().min(1, 'Message is required').max(1000, 'Keep the message under 1000 characters'),
  route: z
    .string()
    .trim()
    .max(512, 'Keep the route under 512 characters')
    .refine((value) => value === '' || isPushRoute(value), 'Use an app route such as /property/123 or an https link')
    .optional(),
  role: z.enum(SEGMENT_ROLES).optional(),
  agentId: z.string().optional(),
})

export type NotificationComposerValues = z.infer<typeof notificationComposerSchema>

export const notificationComposerDefaults: NotificationComposerValues = {
  channel: 'broadcast',
  typeKey: 'promotion_generic',
  title: '',
  body: '',
  route: '',
  role: 'all',
  agentId: 'all',
}
