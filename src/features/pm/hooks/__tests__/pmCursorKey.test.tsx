import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { pmCursorKey } from '../pmCursorKey'

describe('PM cursor scope', () => {
  it('resets the page and history when the owner changes', () => {
    const { result, rerender } = renderHook(
      ({ owner, status, limit }) => useCursorPagination(pmCursorKey(owner, status, limit)),
      { initialProps: { owner: 20, status: 'open', limit: 50 } },
    )

    act(() => result.current.next('page-2'))
    expect(result.current.cursor).toBe('page-2')
    rerender({ owner: 21, status: 'open', limit: 50 })
    expect(result.current.cursor).toBeNull()
    expect(result.current.canPrev).toBe(false)
  })

  it.each([
    ['filter', ['open', 50], ['closed', 50]],
    ['page size', ['open', 50], ['open', 100]],
  ])('resets the page when %s changes', (_name, initial, next) => {
    const { result, rerender } = renderHook(
      ({ status, limit }) => useCursorPagination(pmCursorKey(20, status, limit)),
      { initialProps: { status: String(initial[0]), limit: Number(initial[1]) } },
    )

    act(() => result.current.next('page-2'))
    expect(result.current.cursor).toBe('page-2')
    rerender({ status: String(next[0]), limit: Number(next[1]) })
    expect(result.current.cursor).toBeNull()
  })
})
