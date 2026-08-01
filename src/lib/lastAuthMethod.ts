import type { AuthMethod } from '@/lib/auth'
import { readJSON, removeStored, writeJSON } from '@/lib/storage'

const STORAGE_KEY = '360ghar:lastAuthMethod'

export interface LastAuthMethod {
  method: AuthMethod
  /** Masked identifier hint (never the full phone/email) shown on the login screen. */
  identifierHint: string
  /** Epoch milliseconds of the last successful auth with this method. */
  ts: number
}

const VALID_METHODS: ReadonlySet<string> = new Set<AuthMethod>([
  'google',
  'email_password',
  'phone_password',
  'phone_otp',
  'email_otp',
])

/**
 * Mask an identifier for display: keep a little context, hide the rest.
 * - phone "+919876543210" -> "+91••••3210"
 * - email "alice@360ghar.com" -> "a•••@360ghar.com"
 */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim()
  if (!value) return ''

  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    const head = local.slice(0, 1)
    return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`
  }

  // Phone-like: keep last 4 digits.
  const last4 = value.slice(-4)
  const prefix = value.startsWith('+') ? value.slice(0, 3) : ''
  return `${prefix}${'•'.repeat(4)}${last4}`
}

const isValidLastAuthMethod = (value: unknown): value is LastAuthMethod => {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.method === 'string' &&
    VALID_METHODS.has(p.method) &&
    typeof p.identifierHint === 'string' &&
    typeof p.ts === 'number'
  )
}

export function getLastAuthMethod(): LastAuthMethod | null {
  return readJSON<LastAuthMethod | null>(STORAGE_KEY, null, isValidLastAuthMethod)
}

export function setLastAuthMethod(method: AuthMethod, identifier?: string): void {
  const payload: LastAuthMethod = {
    method,
    identifierHint: identifier ? maskIdentifier(identifier) : '',
    ts: Date.now(),
  }
  writeJSON(STORAGE_KEY, payload)
}

export function clearLastAuthMethod(): void {
  removeStored(STORAGE_KEY)
}
