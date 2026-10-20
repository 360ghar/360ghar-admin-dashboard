import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readJSON,
  readVersionedJSON,
  removeAccountFilters,
  removeStored,
  scopedStorageKey,
  writeJSON,
  writeVersionedJSON,
} from '@/lib/storage'

describe('browser storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('handles blocked reads, writes, and removal', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new DOMException('blocked', 'SecurityError') },
      setItem: () => { throw new DOMException('blocked', 'SecurityError') },
      removeItem: () => { throw new DOMException('blocked', 'SecurityError') },
    })
    expect(readJSON('key', 'fallback')).toBe('fallback')
    expect(() => writeJSON('key', { value: 1 })).not.toThrow()
    expect(() => removeStored('key')).not.toThrow()
  })

  it('removes expired and incompatible versioned values', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    writeVersionedJSON('profile', 1, { id: 1 }, 1000)
    expect(readVersionedJSON('profile', 1, (v): v is { id: number } =>
      typeof v === 'object' && v !== null && 'id' in v && v.id === 1)).toEqual({ id: 1 })
    vi.advanceTimersByTime(1001)
    expect(readVersionedJSON('profile', 1, (v): v is { id: number } =>
      typeof v === 'object' && v !== null && 'id' in v && v.id === 1)).toBeNull()
    expect(localStorage.getItem('profile')).toBeNull()

    writeVersionedJSON('profile', 1, { id: 1 })
    expect(readVersionedJSON('profile', 2, (v): v is { id: number } =>
      typeof v === 'object' && v !== null && 'id' in v && v.id === 1)).toBeNull()
    expect(localStorage.getItem('profile')).toBeNull()
  })

  it('separates account and owner scopes', () => {
    expect(scopedStorageKey('filters', 'account-a', 1)).not.toBe(scopedStorageKey('filters', 'account-a', 2))
    expect(scopedStorageKey('filters', 'account-a')).not.toBe(scopedStorageKey('filters', 'account-b'))
  })

  it('removes the saved filters of one account and keeps layout choices and other accounts', () => {
    const filters = scopedStorageKey('filters_users', 'account-a')
    const ownerFilters = scopedStorageKey('filters_pm_properties', 'account-a', 7)
    const otherAccount = scopedStorageKey('filters_users', 'account-b')
    const prefix = scopedStorageKey('filters_users', 'account-a-2')
    const pageSize = scopedStorageKey('page-size-users', 'account-a')
    for (const key of [filters, ownerFilters, otherAccount, prefix, pageSize]) writeJSON(key, { q: '+919876543210' })

    removeAccountFilters('account-a')

    expect(localStorage.getItem(filters)).toBeNull()
    expect(localStorage.getItem(ownerFilters)).toBeNull()
    expect(localStorage.getItem(otherAccount)).not.toBeNull()
    expect(localStorage.getItem(prefix)).not.toBeNull()
    expect(localStorage.getItem(pageSize)).not.toBeNull()
  })
})
