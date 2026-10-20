import { useState, useEffect, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { selectCurrentUser } from '@/features/auth/slices/authSlice'
import { useAppSelector } from '@/hooks/redux'
import { readVersionedJSON, removeStored, scopedStorageKey, writeVersionedJSON } from '@/lib/storage'
import {
  useGetMyNotificationsQuery,
  useMarkDeliveryOpenedMutation,
  type NotificationItem as ServerNotification,
} from '@/features/core/api/notificationsApi'
import { isNotificationTypeKey, type NotificationTypeKey } from '@/features/core/notificationTypes'

// ---------------------------------------------------------------------------
// Unified notification type that normalises server + local notifications
// ---------------------------------------------------------------------------

export type NotificationSource = 'server' | 'local'

export type NotificationType =
  | 'visit_reminder'
  | 'booking_update'
  | 'payment_received'
  | 'property_available'
  | 'system_message'
  | 'marketing'
  | 'general'

export interface NotificationItem {
  /** Unique composite key: "server:<id>" or "local:<uuid>" */
  id: string
  /** Underlying ID for API calls (server delivery ID or local UUID) */
  rawId: string
  /** Where this notification originated */
  source: NotificationSource
  /** Normalised notification category */
  type: NotificationType
  /** Short heading */
  title: string
  /** Body / description */
  message: string
  /** Arbitrary payload from server or local */
  data?: Record<string, unknown>
  /** Whether the user has already read/opened it */
  isRead: boolean
  /** ISO timestamp */
  createdAt: string
  /** Optional expiry — only local notifications use this today */
  expiresAt?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const localNotificationsKey = (accountId: string) => scopedStorageKey('notifications_local', accountId)

const isNotificationItem = (value: unknown): value is NotificationItem => {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.rawId === 'string' &&
    (p.source === 'server' || p.source === 'local') &&
    typeof p.type === 'string' &&
    typeof p.title === 'string' &&
    typeof p.message === 'string' &&
    typeof p.isRead === 'boolean' &&
    typeof p.createdAt === 'string'
  )
}

const isLocalNotificationItemArray = (value: unknown): value is NotificationItem[] =>
  Array.isArray(value) && value.every((item) => isNotificationItem(item) && item.source === 'local')

function loadLocalNotifications(accountId: string): NotificationItem[] {
  return readVersionedJSON(localNotificationsKey(accountId), 1, isLocalNotificationItemArray) ?? []
}

function saveLocalNotifications(accountId: string, items: NotificationItem[]) {
  // Keep arbitrary payloads and transactional notifications out of storage.
  const safeItems = items
    .filter((item) => item.source === 'local' &&
      (item.type === 'general' || item.type === 'system_message' || item.type === 'marketing'))
    .map(({ id, rawId, source, type, title, message, isRead, createdAt, expiresAt }) =>
    ({ id, rawId, source, type, title, message, isRead, createdAt, expiresAt }))
  writeVersionedJSON(localNotificationsKey(accountId), 1, safeItems, 7 * 24 * 60 * 60 * 1000)
}

/**
 * Category of each backend notification type. Typed over the full `type_key`
 * union: a key the backend adds fails the type check until it is placed here.
 */
const TYPE_CATEGORY: Record<NotificationTypeKey, NotificationType> = {
  booking_confirmed: 'booking_update',
  payment_failed: 'booking_update',
  document_approved: 'system_message',
  chat_message: 'general',
  password_changed: 'system_message',
  security_alert: 'system_message',
  app_update: 'system_message',
  policy_update: 'system_message',
  promotion_generic: 'marketing',
  discount_offer: 'marketing',
  win_back: 'marketing',
  upsell_suggestion: 'marketing',
  onboarding_nudge: 'marketing',
  visit_reminder: 'visit_reminder',
  property_recommendation: 'property_available',
  daily_digest: 'marketing',
  flatmate_new_message: 'general',
  flatmate_new_match: 'general',
  flatmate_listing_approved: 'property_available',
  flatmate_listing_rejected: 'property_available',
  flatmate_account_suspended: 'system_message',
  flatmate_account_warned: 'system_message',
  flatmate_report_actioned: 'system_message',
  flatmate_report_dismissed: 'system_message',
  flatmate_visit_scheduled: 'visit_reminder',
  flatmate_visit_confirmed: 'visit_reminder',
  admin_broadcast: 'system_message',
}

/** Category from the backend `type` field. A missing or unknown type is `general`. */
function categoryOf(type: string | null | undefined): NotificationType {
  return type && isNotificationTypeKey(type) ? TYPE_CATEGORY[type] : 'general'
}

/** Convert a server inbox row into a NotificationItem. `id` is the delivery id. */
function toNotificationItem(entry: ServerNotification): NotificationItem {
  return {
    id: `server:${entry.id}`,
    rawId: entry.id,
    source: 'server',
    type: categoryOf(entry.type),
    title: entry.title,
    message: entry.body,
    data: entry.data ?? undefined,
    isRead: entry.read_at != null,
    createdAt: entry.created_at ?? new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseNotificationsReturn {
  notifications: NotificationItem[]
  unreadCount: number
  isFetching: boolean
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (
    notification: Omit<NotificationItem, 'id' | 'rawId' | 'source' | 'isRead' | 'createdAt'>,
  ) => void
  removeNotification: (id: string) => void
}

export const useNotifications = (): UseNotificationsReturn => {
  const currentUser = useAppSelector(selectCurrentUser)
  const accountId = currentUser?.supabase_user_id ?? null
  const { toast } = useToast()

  // ---- Local-only notifications (persisted in localStorage) ----
  const [localState, setLocalState] = useState<{ accountId: string | null; items: NotificationItem[] }>(() => ({
    accountId,
    items: accountId ? loadLocalNotifications(accountId) : [],
  }))
  const localNotifications = useMemo(
    () => localState.accountId === accountId ? localState.items : [],
    [accountId, localState],
  )
  const setLocalNotifications = useCallback((update: (items: NotificationItem[]) => NotificationItem[]) => {
    setLocalState((previous) => {
      if (previous.accountId !== accountId) return previous
      return { accountId, items: update(previous.items) }
    })
  }, [accountId])

  useEffect(() => {
    setLocalState({ accountId, items: accountId ? loadLocalNotifications(accountId) : [] })
  }, [accountId])

  // Persist local notifications whenever they change
  useEffect(() => {
    if (accountId && localState.accountId === accountId) saveLocalNotifications(accountId, localState.items)
  }, [accountId, localState])

  useEffect(() => {
    if (!accountId) removeStored('notifications_local')
  }, [accountId])

  // Auto-remove expired local notifications every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setLocalNotifications((prev) =>
        prev.filter((n) => {
          if (!n.expiresAt) return true
          return new Date(n.expiresAt) > now
        }),
      )
    }, 60000)
    return () => clearInterval(interval)
  }, [setLocalNotifications])

  // ---- Server notifications via RTK Query ----
  // The signed-in user's own inbox. Row ids are delivery ids, the value the `opened` route takes.
  const {
    currentData: serverNotifications,
    isFetching,
  } = useGetMyNotificationsQuery({ limit: 50 }, { skip: !accountId })

  // Track which server notification IDs we have already marked as opened
  // so we can reflect that locally without waiting for a refetch.
  const [openedServerIds, setOpenedServerIds] = useState<Set<string>>(new Set())

  useEffect(() => setOpenedServerIds(new Set()), [accountId])

  const [markDeliveryOpened] = useMarkDeliveryOpenedMutation()

  // ---- Merge server + local into a unified list ----
  const notifications = useMemo<NotificationItem[]>(() => {
    const serverItems: NotificationItem[] = (serverNotifications?.items ?? []).map((entry) => {
      const item = toNotificationItem(entry)
      // If we've locally marked this as opened, reflect it immediately
      if (openedServerIds.has(entry.id)) {
        item.isRead = true
      }
      return item
    })

    // Server items first (newest first), then local items
    const merged = [...serverItems, ...localNotifications]

    // Sort by createdAt descending (newest first)
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return merged
  }, [serverNotifications, localNotifications, openedServerIds])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  // ---- Actions ----

  const markAsRead = useCallback(
    (id: string) => {
      // Optimistically mark local state for local notifications
      if (id.startsWith('local:')) {
        setLocalNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        )
        return
      }

      // Server notification — extract rawId and call the mutation
      if (id.startsWith('server:')) {
        const rawId = id.replace('server:', '')
        // Optimistically mark as read
        setOpenedServerIds((prev) => new Set(prev).add(rawId))
        void markDeliveryOpened({ deliveryId: rawId }).unwrap().catch(() => {
          // Best-effort: silently ignore failures for analytics-style calls
        })
      }
    },
    [markDeliveryOpened, setLocalNotifications],
  )

  const markAllAsRead = useCallback(() => {
    // Mark all local notifications as read
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

    // Mark all unread server notifications as opened. Deduplicate by rawId
    // (the merged list may contain the same delivery via multiple sources)
    // and fire all requests in parallel via Promise.allSettled so one failure
    // doesn't reject the whole batch. Best-effort — failures are swallowed
    // because these are analytics-style calls.
    const serverUnread = notifications.filter((n) => n.source === 'server' && !n.isRead)
    const seenRawIds = new Set<string>()
    const newOpened = new Set(openedServerIds)
    const promises: Promise<unknown>[] = []
    for (const n of serverUnread) {
      if (seenRawIds.has(n.rawId)) continue
      seenRawIds.add(n.rawId)
      newOpened.add(n.rawId)
      promises.push(markDeliveryOpened({ deliveryId: n.rawId }).unwrap().catch(() => {}))
    }
    setOpenedServerIds(newOpened)
    void Promise.allSettled(promises)
  }, [notifications, openedServerIds, markDeliveryOpened, setLocalNotifications])

  const addNotification = useCallback(
    (notification: Omit<NotificationItem, 'id' | 'rawId' | 'source' | 'isRead' | 'createdAt'>) => {
      const rawId = crypto.randomUUID()
      const newNotification: NotificationItem = {
        ...notification,
        id: `local:${rawId}`,
        rawId,
        source: 'local',
        isRead: false,
        createdAt: new Date().toISOString(),
      }

      setLocalNotifications((prev) => [newNotification, ...prev])

      // Show toast for important types
      if (notification.type !== 'system_message') {
        toast({
          title: notification.title,
          description: notification.message,
        })
      }
    },
    [toast, setLocalNotifications],
  )

  const removeNotification = useCallback(
    (id: string) => {
      // Only allow removing local notifications via this method;
      // server notifications are managed by the server and cache invalidation.
      if (id.startsWith('local:')) {
        setLocalNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    },
    [setLocalNotifications],
  )

  return {
    notifications,
    unreadCount,
    isFetching,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
  }
}
