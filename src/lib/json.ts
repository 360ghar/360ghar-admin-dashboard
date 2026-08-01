/**
 * Safe JSON helpers: never throw on malformed input and always return a
 * well-typed fallback so free-form payloads (rooms_data, questions, custom
 * config JSON) can't crash the UI at render/parse time.
 */

import { isRecord } from '@/lib/storage'

/** Parse raw JSON; returns `fallback` for null/undefined/empty/invalid input. */
export function safeJsonParse<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Parse raw JSON and require the result to be a plain object.
 * Returns null when the input is not valid JSON or not an object.
 */
export function safeJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  const parsed = safeJsonParse<unknown>(raw, null)
  return isRecord(parsed) ? parsed : null
}

/**
 * Validity check for "must be parseable JSON" form fields (used by Zod
 * `.refine`/`superRefine`). Uses `undefined` as the impossible sentinel:
 * every *valid* JSON value (including `null` and `"null"`) parses to
 * something other than `undefined`.
 */
export function isValidJson(raw: string | null | undefined): boolean {
  return safeJsonParse(raw, undefined) !== undefined
}
