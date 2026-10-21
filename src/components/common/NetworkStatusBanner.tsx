import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

type ConnectionStatus = 'online' | 'offline' | 'reconnected'

/** Browser connectivity is a signal, not proof that the API has refreshed. */
export function NetworkStatusBanner() {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  )

  useEffect(() => {
    let hideTimer: number | undefined
    const onOffline = () => {
      window.clearTimeout(hideTimer)
      setStatus('offline')
    }
    const onOnline = () => {
      window.clearTimeout(hideTimer)
      setStatus('reconnected')
      hideTimer = window.setTimeout(() => setStatus('online'), 6000)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearTimeout(hideTimer)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (status === 'online') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 border-b px-4 py-2 text-sm md:px-6 ${status === 'offline' ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-accent/70'}`}
    >
      {status === 'offline' ? <WifiOff className="h-4 w-4 shrink-0" aria-hidden /> : <Wifi className="h-4 w-4 shrink-0" aria-hidden />}
      <span>{status === 'offline'
        ? 'You are offline. Displayed data may be stale. Changes need a connection.'
        : 'Connection restored. Displayed data may still be updating.'}</span>
    </div>
  )
}
