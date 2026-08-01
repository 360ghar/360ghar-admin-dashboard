import { useState, useEffect, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { selectCurrentUser } from '@/features/auth/slices/authSlice'
import { useAppSelector } from '@/hooks/redux'
import { readJSON, writeJSON } from '@/lib/storage'
import {
  useGetUserNotificationsQuery,
  useMarkDeliveryOpenedMutation,
  type UserNotificationLogEntry,
} from '@/features/core/api/notificationsApi'

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

const LOCAL_STORAGE_KEY = 'notifications_local'

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

const isNotificationItemArray = (value: unknown): value is NotificationItem[] =>
  Array.isArray(value) && value.every(isNotificationItem)

function loadLocalNotifications(): NotificationItem[] {
  return readJSON<NotificationItem[]>(LOCAL_STORAGE_KEY, [], isNotificationItemArray)
}

function saveLocalNotifications(items: NotificationItem[]) {
  writeJSON(LOCAL_STORAGE_KEY, items)
}

/** Map audience_type / topic from the server entry to a local NotificationType. */
function inferType(entry: UserNotificationLogEntry): NotificationType {
  const topic = entry.topic?.toLowerCase() ?? ''
  const audience = entry.audience_type?.toLowerCase() ?? ''
  if (topic.includes('visit') || audience.includes('visit')) return 'visit_reminder'
  if (topic.includes('booking') || audience.includes('booking')) return 'booking_update'
  if (topic.includes('payment') || audience.includes('payment')) return 'payment_received'
  if (topic.includes('property') || audience.includes('property')) return 'property_available'
  if (topic.includes('market') || audience.includes('market')) return 'marketing'
  if (topic.includes('system')) return 'system_message'
  return 'general'
}

/** Convert a server UserNotificationLogEntry into a NotificationItem. */
function toNotificationItem(entry: UserNotificationLogEntry): NotificationItem {
  return {
    id: `server:${entry.id}`,
    rawId: entry.id,
    source: 'server',
    type: inferType(entry),
    title: entry.title,
    message: entry.body,
    data: entry.data,
    isRead: entry.opened === true || entry.is_read === true,
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
  const { toast } = useToast()

  // ---- Local-only notifications (persisted in localStorage) ----
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>(loadLocalNotifications)

  // Persist local notifications whenever they change
  useEffect(() => {
    saveLocalNotifications(localNotifications)
  }, [localNotifications])

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
  }, [])

  // ---- Server notifications via RTK Query ----
  const userId = currentUser?.id

  const {
    data: serverNotifications,
    isFetching,
  } = useGetUserNotificationsQuery(
    { userId: userId!, limit: 50, cursor: null },
    { skip: !userId },
  )

  // Track which server notification IDs we have already marked as opened
  // so we can reflect that locally without waiting for a refetch.
  const [openedServerIds, setOpenedServerIds] = useState<Set<string>>(new Set())

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
        markDeliveryOpened({ deliveryId: rawId }).catch(() => {
          // Best-effort: silently ignore failures for analytics-style calls
        })
      }
    },
    [markDeliveryOpened],
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
  }, [notifications, openedServerIds, markDeliveryOpened])

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
    [toast],
  )

  const removeNotification = useCallback(
    (id: string) => {
      // Only allow removing local notifications via this method;
      // server notifications are managed by the server and cache invalidation.
      if (id.startsWith('local:')) {
        setLocalNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    },
    [],
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
