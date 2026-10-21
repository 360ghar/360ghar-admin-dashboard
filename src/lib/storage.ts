/** Browser storage is optional. Every operation must tolerate blocked access. */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readJSON<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  const storage = getStorage()
  if (!storage) return fallback
  try {
    const raw = storage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (validate && !validate(parsed)) {
      removeStored(key)
      return fallback
    }
    return parsed as T
  } catch {
    removeStored(key)
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    getStorage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be disabled, full, or inaccessible.
  }
}

export function removeStored(key: string): void {
  try {
    getStorage()?.removeItem(key)
  } catch {
    // Removal is best effort when browser storage is inaccessible.
  }
}

/** Keep personal preferences separate between accounts and owner scopes. */
export function scopedStorageKey(
  key: string,
  accountId: string | number,
  ownerId?: string | number | null,
): string {
  const owner = ownerId == null ? '' : `:owner:${encodeURIComponent(String(ownerId))}`
  return `360ghar:v1:${encodeURIComponent(key)}:account:${encodeURIComponent(String(accountId))}${owner}`
}

/**
 * Remove every saved list filter of one account. Filter text can hold a customer's name, phone or
 * email, so it must not outlive the session. Page size, column and layout choices stay: they hold no personal data.
 */
export function removeAccountFilters(accountId: string | number): void {
  const storage = getStorage()
  if (!storage) return
  try {
    const account = `:account:${encodeURIComponent(String(accountId))}`
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index)
      if (!key?.startsWith(FILTER_KEY_PREFIX)) continue
      const scope = key.slice(key.indexOf(':account:'))
      if (scope === account || scope.startsWith(`${account}:owner:`)) storage.removeItem(key)
    }
  } catch {
    // Removal is best effort when browser storage is inaccessible.
  }
}

/** `useFilterPersistence` saves under `filters_<name>`. Keep this prefix in step with `scopedStorageKey`. */
const FILTER_KEY_PREFIX = '360ghar:v1:filters_'

interface StoredEnvelope<T> {
  version: number
  expiresAt: number | null
  value: T
}

export function readVersionedJSON<T>(
  key: string,
  version: number,
  validate: (value: unknown) => value is T,
): T | null {
  const isEnvelope = (value: unknown): value is StoredEnvelope<T> => {
    if (!isRecord(value)) return false
    return value.version === version &&
      (value.expiresAt === null ||
        (typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt))) &&
      validate(value.value)
  }
  const envelope = readJSON<StoredEnvelope<T> | null>(key, null, isEnvelope)
  if (!envelope) return null
  if (envelope.expiresAt !== null && envelope.expiresAt <= Date.now()) {
    removeStored(key)
    return null
  }
  return envelope.value
}

export function writeVersionedJSON<T>(
  key: string,
  version: number,
  value: T,
  ttlMs?: number,
): void {
  writeJSON(key, {
    version,
    expiresAt: ttlMs === undefined ? null : Date.now() + ttlMs,
    value,
  } satisfies StoredEnvelope<T>)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
