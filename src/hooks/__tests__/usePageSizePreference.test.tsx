import { act, renderHook } from '@testing-library/react'
import { PAGE_SIZE_OPTIONS, usePageSizePreference } from '../usePageSizePreference'
import { scopedStorageKey } from '@/lib/storage'

const key = (accountId: string) => scopedStorageKey('page-size-properties', accountId)

describe('usePageSizePreference', () => {
  beforeEach(() => localStorage.clear())

  it('persists an allowed size and rejects a stored unsupported size', () => {
    const { result, unmount } = renderHook(() => usePageSizePreference({
      key: 'properties', accountId: 'account-a', defaultSize: 20, sizes: PAGE_SIZE_OPTIONS,
    }))
    act(() => result.current[1](50))
    expect(result.current[0]).toBe(50)
    unmount()

    localStorage.setItem(key('account-a'), JSON.stringify({ version: 1, expiresAt: null, value: 999 }))
    const second = renderHook(() => usePageSizePreference({
      key: 'properties', accountId: 'account-a', defaultSize: 20, sizes: PAGE_SIZE_OPTIONS,
    }))
    expect(second.result.current[0]).toBe(20)
    expect(localStorage.getItem(key('account-a'))).toBeNull()
  })

  it('does not show the previous account size while switching', () => {
    const { result, rerender } = renderHook(
      ({ accountId }) => usePageSizePreference({ key: 'properties', accountId, defaultSize: 20, sizes: PAGE_SIZE_OPTIONS }),
      { initialProps: { accountId: 'account-a' } },
    )
    act(() => result.current[1](50))
    rerender({ accountId: 'account-b' })
    expect(result.current[0]).toBe(20)
    expect(localStorage.getItem(key('account-b'))).toBeNull()
  })
})
