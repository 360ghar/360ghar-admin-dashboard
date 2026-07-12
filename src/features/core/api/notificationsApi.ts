import { api } from '@/store/api'
import type { PaginatedResponse } from '@/types/api'

export interface UserNotificationLogEntry {
  id: string
  title: string
  body: string
  data?: Record<string, unknown>
  audience_type?: string
  target_user_id?: string
  topic?: string
  opened?: boolean
  is_read?: boolean
  created_at?: string
}

export interface MarketingNotificationPayload {
  typeKey: string
  title: string
  body: string
  data?: Record<string, string>
  deep_link?: string
}

export interface MarketingSegmentFilter {
  role?: 'user' | 'agent' | 'admin'
  agent_id?: number
  is_active?: boolean
}

export interface MarketingSegmentRequest extends MarketingNotificationPayload {
  filter: MarketingSegmentFilter
}

export interface DeviceRegistrationPayload {
  token: string
  platform?: string
  app_version?: string
  locale?: string
}

export interface NotificationSendPayload {
  title: string
  body: string
  data?: Record<string, string>
  deep_link?: string
  image?: string
}

export interface NotificationSendToTokenPayload extends NotificationSendPayload {
  token: string
}

export interface NotificationSendToUserPayload extends NotificationSendPayload {
  user_id: string | number
}

export interface NotificationSendToTopicPayload extends NotificationSendPayload {
  topic: string
}

export interface NotificationSendBulkPayload extends NotificationSendPayload {
  tokens: string[]
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserNotifications: builder.query<
      PaginatedResponse<UserNotificationLogEntry>,
      number | { userId: number; limit?: number; cursor?: string | null }
    >({
      query: (params) => {
        const userId = typeof params === 'number' ? params : params.userId
        const queryParams =
          typeof params === 'number'
            ? undefined
            : { limit: params.limit, cursor: params.cursor ?? undefined }
        return {
          url: `/notifications/users/${userId}`,
          params: queryParams,
        }
      },
      providesTags: (res) => res?.items
        ? [...res.items.map((n) => ({type: 'Notification' as const, id: n.id})), {type: 'Notification', id: 'LIST'}]
        : [{type: 'Notification', id: 'LIST'}],
    }),

    registerDeviceToken: builder.mutation<void, DeviceRegistrationPayload>({
      query: (data) => ({
        url: '/notifications/devices/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendToToken: builder.mutation<void, NotificationSendToTokenPayload>({
      query: (data) => ({
        url: '/notifications/send/token',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendToUser: builder.mutation<void, NotificationSendToUserPayload>({
      query: (data) => ({
        url: '/notifications/send/user',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendToTopic: builder.mutation<void, NotificationSendToTopicPayload>({
      query: (data) => ({
        url: '/notifications/send/topic',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendBulkTokens: builder.mutation<void, NotificationSendBulkPayload>({
      query: (data) => ({
        url: '/notifications/send/bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    markDeliveryOpened: builder.mutation<void, { deliveryId: string | number }>({
      query: ({ deliveryId }) => ({
        url: `/notifications/deliveries/${deliveryId}/opened`,
        method: 'POST',
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendMarketingBroadcast: builder.mutation<
      { requested: number; processed: number },
      MarketingNotificationPayload
    >({
      query: ({ typeKey, title, body, data, deep_link }) => ({
        url: '/notifications/marketing/broadcast',
        method: 'POST',
        body: {
          type_key: typeKey,
          title,
          body,
          data,
          deep_link,
        },
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendMarketingToSegment: builder.mutation<
      { requested: number; processed: number },
      MarketingSegmentRequest
    >({
      query: ({ typeKey, title, body, data, deep_link, filter }) => ({
        url: '/notifications/marketing/segment',
        method: 'POST',
        body: {
          type_key: typeKey,
          title,
          body,
          data,
          deep_link,
          filter,
        },
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),
  }),
})

export const {
  useGetUserNotificationsQuery,
  useRegisterDeviceTokenMutation,
  useSendToTokenMutation,
  useSendToUserMutation,
  useSendToTopicMutation,
  useSendBulkTokensMutation,
  useMarkDeliveryOpenedMutation,
  useSendMarketingBroadcastMutation,
  useSendMarketingToSegmentMutation,
} = notificationsApi

