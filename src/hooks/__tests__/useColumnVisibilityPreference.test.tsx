import { act, renderHook } from '@testing-library/react'
import { useColumnVisibilityPreference } from '../useColumnVisibilityPreference'

it('restores columns only for the matching account key', () => {
  localStorage.clear()
  const view = renderHook(({ key }) => useColumnVisibilityPreference(key), {
    initialProps: { key: 'properties-account-a' },
  })

  act(() => view.result.current[1]({ city: false }))
  expect(view.result.current[0].city).toBe(false)
  expect(localStorage.getItem('properties-account-a:columns')).toContain('"city":false')

  view.rerender({ key: 'properties-account-b' })
  expect(view.result.current[0].city).toBeUndefined()
  act(() => view.result.current[1]({ price: false }))
  view.rerender({ key: 'properties-account-a' })
  expect(view.result.current[0].city).toBe(false)
  expect(view.result.current[0].price).toBeUndefined()
})
