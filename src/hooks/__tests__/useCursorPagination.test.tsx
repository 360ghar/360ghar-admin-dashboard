import { renderHook, act } from '@testing-library/react'
import { useCursorPagination } from '../useCursorPagination'

describe('useCursorPagination', () => {
  it('starts on the first page', () => {
    const { result } = renderHook(() => useCursorPagination('filters-a'))
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })

  it('advances and rewinds through the history stack', () => {
    const { result } = renderHook(() => useCursorPagination('filters-a'))

    act(() => {
      result.current.next('cursor-1')
    })
    expect(result.current.cursor).toBe('cursor-1')
    expect(result.current.canPrev).toBe(true)

    act(() => {
      result.current.next('cursor-2')
    })
    expect(result.current.cursor).toBe('cursor-2')

    act(() => {
      result.current.prev()
    })
    expect(result.current.cursor).toBe('cursor-1')

    act(() => {
      result.current.prev()
    })
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })

  it('ignores next() without a cursor (prevents false advance)', () => {
    const { result } = renderHook(() => useCursorPagination('filters-a'))

    act(() => {
      result.current.next(null)
      result.current.next(undefined)
      result.current.next('')
    })
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })

  it('resets cursor synchronously when resetKey changes (no stale page request)', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useCursorPagination(key),
      { initialProps: { key: 'q=a' } },
    )

    act(() => {
      result.current.next('page-2')
    })
    expect(result.current.cursor).toBe('page-2')
    expect(result.current.canPrev).toBe(true)

    // Same render where key changes must expose cursor=null to the consumer.
    rerender({ key: 'q=b' })
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })

  it('manual reset clears stack', () => {
    const { result } = renderHook(() => useCursorPagination('x'))
    act(() => {
      result.current.next('c1')
      result.current.reset()
    })
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })
})
