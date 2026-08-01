/**
 * Shared localStorage helpers with a single, consistent failure policy.
 *
 * - SSR-safe: every access is guarded against a missing `localStorage` global.
 * - Never throw: privacy modes (SecurityError) and quota errors degrade to the
 *   in-memory fallback.
 * - Self-healing: corrupt payloads are removed so the next read starts clean.
 * - `readJSON` accepts an optional type-guard validator so restored values are
 *   checked at the storage boundary instead of blind-cast (see authSlice,
 *   pmSlice, useFilterPersistence).
 */

function canUseStorage(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    // Probing `localStorage` itself throws in some privacy/incognito modes.
    localStorage.length
    return true
  } catch {
    return false
  }
}

/**
 * Read a JSON value from localStorage. Corrupt payloads are removed and the
 * fallback is returned; when `validate` is provided, values that fail the
 * guard are treated the same way (removed + fallback).
 */
export function readJSON<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  if (!canUseStorage()) return fallback
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (validate && !validate(parsed)) {
      localStorage.removeItem(key)
      return fallback
    }
    return parsed as T
  } catch {
    // Corrupt payload — drop it so the next read starts clean.
    localStorage.removeItem(key)
    return fallback
  }
}

/** Write a JSON value to localStorage (best-effort; quota/privacy failures are ignored). */
export function writeJSON(key: string, value: unknown): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded / private mode — the app keeps working in-memory.
  }
}

/** Remove a key from localStorage (best-effort). */
export function removeStored(key: string): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Type guard for plain JSON objects (non-null, non-array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
