import { Link } from 'react-router-dom'
import { Bell, X, CheckCheck, Settings, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, type NotificationItem, type NotificationType } from '@/hooks/useNotifications'
import { useUserRole } from '@/hooks/useUserRole'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/format'

interface NotificationCenterProps {
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'visit_reminder':
      return '📅'
    case 'booking_update':
      return '🏠'
    case 'payment_received':
      return '💰'
    case 'property_available':
      return '📍'
    case 'system_message':
      return '📢'
    case 'marketing':
      return '📣'
    case 'general':
    default:
      return '📩'
  }
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  align = 'end',
  side = 'bottom',
}) => {
  const {
    notifications,
    unreadCount,
    isFetching,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()
  const { role } = useUserRole()
  // Composer at /notifications is admin-only; agents manage prefs on preferences.
  const settingsHref = role === 'admin' ? '/notifications' : '/users/preferences'
  const settingsLabel = role === 'admin' ? 'Notification composer' : 'Notification preferences'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-[min(24rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between p-4">
          <DropdownMenuLabel className="text-lg font-semibold">
            Notifications
          </DropdownMenuLabel>
          <div className="flex gap-1">
            {isFetching && (
              <LoadingSpinner size="sm" className="text-muted-foreground" />
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 w-8 p-0"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
              <Link to={settingsHref} aria-label={settingsLabel}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
          {notifications.length === 0 && !isFetching ? (
            <div className="p-4">
              <EmptyState size="sm" icon={<Bell className="h-8 w-8" />} title="No notifications" />
            </div>
          ) : (
            notifications.map((notification: NotificationItem) => (
              <DropdownMenuGroup key={notification.id}>
                <DropdownMenuItem
                  className="flex-col items-start p-4 cursor-default"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex w-full items-start gap-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${notification.isRead ? '' : 'font-semibold'}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-primary rounded-full" />
                          )}
                          {notification.source === 'local' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeNotification(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
                {notification.id !== notifications[notifications.length - 1].id && (
                  <DropdownMenuSeparator />
                )}
              </DropdownMenuGroup>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // Only remove local notifications; server ones are managed by the server
                  notifications
                    .filter((n) => n.source === 'local')
                    .forEach((n) => removeNotification(n.id))
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear local notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationCenter
