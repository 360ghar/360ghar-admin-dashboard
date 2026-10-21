import { renderHook, act } from '@testing-library/react'
import { useFilterPersistence } from '../useFilterPersistence'
import { scopedStorageKey } from '@/lib/storage'

const key = scopedStorageKey('filters_test', 'account-a')

describe('useFilterPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default values initially', () => {
    const { result } = renderHook(() =>
      useFilterPersistence({
        key: 'test',
        accountId: 'account-a',
        defaultValue: { q: '', city: '' },
      }),
    )

    expect(result.current.filters).toEqual({ q: '', city: '' })
  })

  it('persists active filters to localStorage (debounced)', () => {
    jest.useFakeTimers()
    try {
      const { result } = renderHook(() =>
        useFilterPersistence({
          key: 'test',
          accountId: 'account-a',
          defaultValue: { q: '' },
          debounceMs: 0,
        }),
      )

      act(() => {
        result.current.setFilters({ q: 'search' })
      })
      act(() => {
        jest.advanceTimersByTime(5)
      })

      expect(localStorage.getItem(key)).toBe('{"q":"search"}')
    } finally {
      jest.useRealTimers()
    }
  })

  it('loads persisted filters from localStorage on mount', () => {
    localStorage.setItem(key, '{"q":"saved"}')

    const { result } = renderHook(() =>
      useFilterPersistence({
        key: 'test',
        accountId: 'account-a',
        defaultValue: { q: '' },
      }),
    )

    expect(result.current.filters.q).toBe('saved')
  })

  it('drops invalid elements from a saved numeric filter array', () => {
    localStorage.setItem(key, '{"amenities":[1,"2",{"id":3},2]}')
    const { result } = renderHook(() => useFilterPersistence({
      key: 'test',
      accountId: 'account-a',
      defaultValue: { amenities: [] as number[] },
      arrayItemTypes: { amenities: 'number' },
    }))
    expect(result.current.filters.amenities).toEqual([1, 2])
  })

  it('replaces an unsupported saved enum with the default', () => {
    localStorage.setItem(key, '{"status":"deleted"}')
    const { result } = renderHook(() => useFilterPersistence({
      key: 'test',
      accountId: 'account-a',
      defaultValue: { status: 'all' },
      allowedValues: { status: ['all', 'active'] },
    }))
    expect(result.current.filters.status).toBe('all')
  })

  it('keeps setter identity and skips unchanged filter updates', () => {
    let renders = 0
    const { result, rerender } = renderHook(() => {
      renders += 1
      return useFilterPersistence({ key: 'test', accountId: 'account-a', defaultValue: { amenities: [] as number[] } })
    })
    const setter = result.current.setFilters
    rerender()
    expect(result.current.setFilters).toBe(setter)
    const beforeNoop = renders
    act(() => result.current.setFilters({ amenities: [] }))
    expect(renders).toBe(beforeNoop)
  })

  it('does not expose saved filters from another account', () => {
    localStorage.setItem(key, '{"q":"private search"}')
    const { result, rerender } = renderHook(
      ({ accountId }) => useFilterPersistence({ key: 'test', accountId, defaultValue: { q: '' } }),
      { initialProps: { accountId: 'account-a' } },
    )
    expect(result.current.filters.q).toBe('private search')
    rerender({ accountId: 'account-b' })
    expect(result.current.filters.q).toBe('')
    expect(localStorage.getItem(scopedStorageKey('filters_test', 'account-b'))).toBeNull()
  })
})
