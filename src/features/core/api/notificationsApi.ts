import { api } from '@/store/api'
import type { components } from '@/lib/api/schema.gen'
import type { PaginatedResponse } from '@/types/api'

type S = components['schemas']

/** One inbox row. `id` is the delivery id (the value `opened` takes), `type` is the notification type key, `read_at` is null until opened. */
export type NotificationItem = S['NotificationItem']
export type NotificationPage = S['NotificationPage']
export type DeliveryRead = S['DeliveryReadOut']
export type MarketingNotificationBody = S['MarketingNotification']
export type MarketingSegmentBody = S['MarketingSegmentRequest']
export type MarketingSegmentFilter = S['SegmentFilter']
/** `{ requested, processed, succeeded }`. `requested` is the audience size (active users), `processed` is the users the send was dispatched to, and `succeeded` counts dispatches with no error. Consent can still block a channel. */
export type MarketingSendResult = S['MarketingSendResult']

export interface MarketingNotificationPayload {
  typeKey: MarketingNotificationBody['type_key']
  title: string
  body: string
  data?: Record<string, string>
  /** Push route (for example `/property/123`). The backend delivers it to the app as `data.route`. */
  deep_link?: string
}

export interface MarketingSegmentRequest extends MarketingNotificationPayload {
  filter: MarketingSegmentFilter
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // The signed-in user's own inbox, newest first. Rows stay listed after they are opened.
    getMyNotifications: builder.query<NotificationPage, { limit?: number; cursor?: string | null; unread_only?: boolean } | void>({
      query: (params) => ({
        url: '/notifications/me',
        params: { limit: 50, ...(params || {}) },
      }),
      providesTags: (res) => res?.items
        ? [...res.items.map((n) => ({type: 'Notification' as const, id: n.id})), {type: 'Notification', id: 'LIST'}]
        : [{type: 'Notification', id: 'LIST'}],
    }),

    // Delivery history of one user (admin view). Same row shape as the inbox.
    getUserNotifications: builder.query<
      PaginatedResponse<NotificationItem>,
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

    // Mark one inbox row read. `deliveryId` is the row `id` from the inbox, not a notification id.
    markDeliveryOpened: builder.mutation<DeliveryRead, { deliveryId: string }>({
      query: ({ deliveryId }) => ({
        url: `/notifications/deliveries/${deliveryId}/opened`,
        method: 'POST',
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendMarketingBroadcast: builder.mutation<MarketingSendResult, MarketingNotificationPayload>({
      query: ({ typeKey, title, body, data, deep_link }) => {
        const payload: MarketingNotificationBody = { type_key: typeKey, title, body, data, deep_link }
        return { url: '/notifications/marketing/broadcast', method: 'POST', body: payload }
      },
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),

    sendMarketingToSegment: builder.mutation<MarketingSendResult, MarketingSegmentRequest>({
      query: ({ typeKey, title, body, data, deep_link, filter }) => {
        const payload: MarketingSegmentBody = { type_key: typeKey, title, body, data, deep_link, filter }
        return { url: '/notifications/marketing/segment', method: 'POST', body: payload }
      },
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),
  }),
})

export const {
  useGetMyNotificationsQuery,
  useGetUserNotificationsQuery,
  useMarkDeliveryOpenedMutation,
  useSendMarketingBroadcastMutation,
  useSendMarketingToSegmentMutation,
} = notificationsApi
