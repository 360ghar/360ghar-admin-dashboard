import { useState, useEffect, useRef, useMemo } from 'react'
import { readJSON, removeStored, writeJSON } from '@/lib/storage'

interface FilterPersistenceOptions<T extends Record<string, unknown>> {
  key: string
  defaultValue: T
  debounceMs?: number
}

/**
 * Restore a persisted filter object onto the current defaults, dropping or
 * replacing anything whose shape no longer matches (stale keys from older
 * deploys, wrong types, malformed arrays). Without this, a stale localStorage
 * value could silently produce invalid API query params.
 */
function sanitizeRestored<T extends Record<string, unknown>>(restored: unknown, defaults: T): T {
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
      result[key] = Array.isArray(value)
        ? value.filter((item) => fallback.length === 0 || typeof item === typeof fallback[0])
        : fallback
      continue
    }
    result[key] = typeof value === typeof fallback ? value : fallback
  }
  return result as T
}

export function useFilterPersistence<T extends Record<string, unknown>>({
  key,
  defaultValue,
  debounceMs = 300
}: FilterPersistenceOptions<T>) {
  const defaultValueRef = useRef(defaultValue)
  const storageKey = `filters_${key}`
  const [filters, setFiltersState] = useState<T>(() =>
    sanitizeRestored(readJSON<unknown>(storageKey, null), defaultValueRef.current),
  )

  const setFilters = (newFilters: Partial<T>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFiltersState({ ...defaultValueRef.current })
    removeStored(storageKey)
  }

  const resetFilters = () => {
    setFilters({ ...defaultValueRef.current })
  }

  const isEqual = (a: unknown, b: unknown) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => item === b[index])
    }
    return a === b
  }

  const hasActiveFilters = useMemo(() =>
    (Object.keys(filters) as Array<keyof T>).some((k) =>
      !isEqual(filters[k], defaultValueRef.current[k])
    ), [filters, defaultValueRef])

  // Auto-save on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasActiveFilters) {
        removeStored(storageKey)
        return
      }
      writeJSON(storageKey, filters)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [filters, storageKey, debounceMs, hasActiveFilters])

  return {
    filters,
    setFilters,
    clearFilters,
    resetFilters,
    hasActiveFilters
  }
}