const STORAGE_KEY = '360ghar:post-login-destination:v1'
const TTL_MS = 10 * 60 * 1000
const DEFAULT_DESTINATION = '/dashboard'

/** Accept only a route in this app. Never use an external or auth-page redirect. */
export function safePostLoginDestination(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_DESTINATION
  }

  try {
    const url = new URL(value, 'https://360ghar.local')
    if (url.origin !== 'https://360ghar.local') return DEFAULT_DESTINATION
    if (['/login', '/signup', '/forgot-password', '/auth/callback', '/access-denied'].includes(url.pathname)) {
      return DEFAULT_DESTINATION
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_DESTINATION
  }
}

/** OAuth leaves the SPA; keep its return route only in this tab for ten minutes. */
export function rememberPostLoginDestination(value: unknown): void {
  const destination = safePostLoginDestination(value)
  try {
    if (destination === DEFAULT_DESTINATION) {
      sessionStorage.removeItem(STORAGE_KEY)
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, destination, expiresAt: Date.now() + TTL_MS }))
    }
  } catch {
    // Private browsing can block session storage. The dashboard remains a safe fallback.
  }
}

export function peekPostLoginDestination(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DESTINATION
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || !('version' in value) || !('destination' in value) || !('expiresAt' in value)) {
      sessionStorage.removeItem(STORAGE_KEY)
      return DEFAULT_DESTINATION
    }
    if (value.version !== 1 || typeof value.expiresAt !== 'number' || value.expiresAt <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY)
      return DEFAULT_DESTINATION
    }
    return safePostLoginDestination(value.destination)
  } catch {
    return DEFAULT_DESTINATION
  }
}

export function consumePostLoginDestination(): string {
  const destination = peekPostLoginDestination()
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* best effort */ }
  return destination
}
