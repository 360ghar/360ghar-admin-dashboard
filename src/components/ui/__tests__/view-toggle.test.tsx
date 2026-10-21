import { act, renderHook } from '@testing-library/react'
import { useViewMode } from '../view-toggle'

it('reads the new preference before painting after an account key change', () => {
  localStorage.clear()
  localStorage.setItem('view-mode-account-a', '"cards"')
  const renders: Array<{ key: string; view: string }> = []
  const { result, rerender } = renderHook(({ key }) => {
    const [view, setView] = useViewMode(key)
    renders.push({ key, view })
    return { view, setView }
  }, { initialProps: { key: 'account-a' } })

  expect(result.current.view).toBe('cards')
  rerender({ key: 'account-b' })
  expect(renders.find((render) => render.key === 'account-b')?.view).toBe('table')
  act(() => result.current.setView('cards'))
  expect(localStorage.getItem('view-mode-account-b')).toBe('"cards"')
  rerender({ key: 'account-a' })
  expect(result.current.view).toBe('cards')
})
