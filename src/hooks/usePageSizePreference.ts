import { useCallback, useEffect, useState } from 'react'
import { readVersionedJSON, scopedStorageKey, writeVersionedJSON } from '@/lib/storage'

interface PageSizeOptions {
  key: string
  accountId: string | null | undefined
  defaultSize: number
  sizes: readonly number[]
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

/** Persist only an allowed page size for the active account. */
export function usePageSizePreference({ key, accountId, defaultSize, sizes }: PageSizeOptions) {
  const storageKey = accountId ? scopedStorageKey(`page-size-${key}`, accountId) : null
  const readSize = useCallback((target: string | null) => target
    ? readVersionedJSON(target, 1, (value): value is number => typeof value === 'number' && sizes.includes(value)) ?? defaultSize
    : defaultSize, [defaultSize, sizes])
  const [stored, setStored] = useState(() => ({ key: storageKey, size: readSize(storageKey) }))
  const pageSize = stored.key === storageKey ? stored.size : defaultSize

  useEffect(() => {
    setStored((previous) => previous.key === storageKey ? previous : { key: storageKey, size: readSize(storageKey) })
  }, [storageKey, readSize])

  const setPageSize = useCallback((size: number) => {
    if (!sizes.includes(size)) return
    setStored((previous) => previous.key === storageKey && previous.size === size
      ? previous
      : { key: storageKey, size })
    if (storageKey) writeVersionedJSON(storageKey, 1, size)
  }, [sizes, storageKey])

  return [pageSize, setPageSize] as const
}
