import { useCallback, useEffect, useState } from 'react'
import type { OnChangeFn, VisibilityState } from '@tanstack/react-table'
import { isRecord, readVersionedJSON, writeVersionedJSON } from '@/lib/storage'

function isVisibilityState(value: unknown): value is VisibilityState {
  return isRecord(value) && Object.keys(value).length <= 40 &&
    Object.values(value).every((visible) => typeof visible === 'boolean')
}

/** A table's column choice follows its account-scoped view key. */
export function useColumnVisibilityPreference(viewStorageKey: string) {
  const key = `${viewStorageKey}:columns`
  const read = (target: string) => readVersionedJSON(target, 1, isVisibilityState) ?? {}
  const [stored, setStored] = useState(() => ({ key, visibility: read(key) }))
  const visibility = stored.key === key ? stored.visibility : read(key)

  useEffect(() => {
    setStored((previous) => previous.key === key ? previous : { key, visibility: read(key) })
  }, [key])

  const setVisibility = useCallback<OnChangeFn<VisibilityState>>((updater) => {
    setStored((previous) => {
      const current = previous.key === key ? previous.visibility : read(key)
      const next = typeof updater === 'function' ? updater(current) : updater
      return { key, visibility: next }
    })
  }, [key])

  useEffect(() => {
    if (stored.key === key) writeVersionedJSON(key, 1, stored.visibility)
  }, [key, stored])

  return [visibility, setVisibility] as const
}
