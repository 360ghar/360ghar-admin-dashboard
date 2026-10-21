import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { readJSON, removeStored, scopedStorageKey, writeJSON } from '@/lib/storage'

interface FilterPersistenceOptions<T extends Record<string, unknown>> {
  key: string
  accountId: string | null | undefined
  defaultValue: T
  debounceMs?: number
  arrayItemTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean'>>
  allowedValues?: Partial<Record<keyof T, readonly (string | number | boolean)[]>>
}

/**
 * Restore a persisted filter object onto the current defaults, dropping or
 * replacing anything whose shape no longer matches (stale keys from older
 * deploys, wrong types, malformed arrays). Without this, a stale localStorage
 * value could silently produce invalid API query params.
 */
function sanitizeRestored<T extends Record<string, unknown>>(
  restored: unknown,
  defaults: T,
  arrayItemTypes?: Partial<Record<keyof T, 'string' | 'number' | 'boolean'>>,
  allowedValues?: Partial<Record<keyof T, readonly (string | number | boolean)[]>>,
): T {
  if (typeof restored !== 'object' || restored === null || Array.isArray(restored)) {
    return { ...defaults }
  }
  const input = restored as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = input[key]
    if (value === undefined) {
      result[key] = fallback
      continue
    }
    if (Array.isArray(fallback)) {
      const itemType = arrayItemTypes?.[key as keyof T] ?? (fallback.length ? typeof fallback[0] : null)
      result[key] = Array.isArray(value) && itemType
        ? value.filter((item) => typeof item === itemType && (typeof item !== 'number' || Number.isFinite(item))).slice(0, 100)
        : fallback
      continue
    }
    const allowed = allowedValues?.[key as keyof T]
    result[key] = typeof value === typeof fallback && (!allowed || allowed.includes(value as string | number | boolean))
      ? value
      : fallback
  }
  return result as T
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index])
  }
  return a === b
}

function filtersEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  return Object.keys(b).every((key) => valuesEqual(a[key], b[key]))
}

export function useFilterPersistence<T extends Record<string, unknown>>({
  key,
  accountId,
  defaultValue,
  debounceMs = 300,
  arrayItemTypes,
  allowedValues,
}: FilterPersistenceOptions<T>) {
  const defaultValueRef = useRef(defaultValue)
  const storageKey = accountId ? scopedStorageKey(`filters_${key}`, accountId) : null
  const [stored, setStored] = useState<{ key: string | null; filters: T }>(() => ({
    key: storageKey,
    filters: storageKey
      ? sanitizeRestored(readJSON<unknown>(storageKey, null), defaultValueRef.current, arrayItemTypes, allowedValues)
      : { ...defaultValueRef.current },
  }))
  // An account change must not render the previous account's saved filters,
  // including during the render before the new key's effect runs.
  const filters = stored.key === storageKey ? stored.filters : defaultValueRef.current

  useEffect(() => {
    setStored((prev) => {
      if (prev.key === storageKey) return prev
      return {
        key: storageKey,
        filters: storageKey
          ? sanitizeRestored(readJSON<unknown>(storageKey, null), defaultValueRef.current, arrayItemTypes, allowedValues)
          : { ...defaultValueRef.current },
      }
    })
  }, [storageKey, arrayItemTypes, allowedValues])

  const setFilters = useCallback((newFilters: Partial<T>) => {
    setStored((prev) => {
      const current = prev.key === storageKey ? prev.filters : defaultValueRef.current
      if (Object.keys(newFilters).every((key) => valuesEqual(current[key], newFilters[key]))) return prev
      return { key: storageKey, filters: { ...current, ...newFilters } }
    })
  }, [storageKey])

  const clearFilters = useCallback(() => {
    setStored((prev) => prev.key === storageKey && filtersEqual(prev.filters, defaultValueRef.current)
      ? prev
      : { key: storageKey, filters: { ...defaultValueRef.current } })
    if (storageKey) removeStored(storageKey)
  }, [storageKey])

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultValueRef.current })
  }, [setFilters])

  const hasActiveFilters = useMemo(() =>
    (Object.keys(filters) as Array<keyof T>).some((k) =>
      !valuesEqual(filters[k], defaultValueRef.current[k])
    ), [filters])

  // Auto-save on filter changes
  useEffect(() => {
    if (!storageKey || stored.key !== storageKey) return
    const timer = setTimeout(() => {
      if (!hasActiveFilters) {
        removeStored(storageKey)
        return
      }
      writeJSON(storageKey, filters)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [filters, stored.key, storageKey, debounceMs, hasActiveFilters])

  return {
    filters,
    setFilters,
    clearFilters,
    resetFilters,
    hasActiveFilters
  }
}
