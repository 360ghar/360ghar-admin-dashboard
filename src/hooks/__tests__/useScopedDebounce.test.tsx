import { act, renderHook } from '@testing-library/react'
import { useScopedDebounce } from '../useScopedDebounce'

it('does not return an old account search while the next value is delayed', () => {
  vi.useFakeTimers()
  try {
    const { result, rerender } = renderHook(
      ({ scope, value }) => useScopedDebounce(value, scope, 300),
      { initialProps: { scope: 'account-a', value: 'alice' } },
    )
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('alice')

    rerender({ scope: 'account-b', value: 'bob' })
    expect(result.current).toBe('bob')
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('bob')
  } finally {
    vi.useRealTimers()
  }
})
