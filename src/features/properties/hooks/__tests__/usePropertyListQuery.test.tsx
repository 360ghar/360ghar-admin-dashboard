import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePropertyListQuery } from '../usePropertyListQuery'

vi.mock('@/features/core/api/amenitiesApi', () => ({
  useGetAmenitiesQuery: () => ({ data: [{ id: 1, title: 'Gym' }], error: undefined, refetch: vi.fn() }),
}))

describe('usePropertyListQuery params', () => {
  beforeEach(() => localStorage.clear())

  it('sends the status filter and enum values only, and never a radius', () => {
    const { result } = renderHook(() => usePropertyListQuery('acct', 'admin'))
    act(() => result.current.setFilters({ status: 'sold', propertyType: 'villa', purpose: 'buy', furnishing: 'furnished', amenities: [1] }))
    const params = result.current.params
    expect(params).toMatchObject({ status: 'sold', property_type: ['villa'], purpose: 'buy', furnishing: ['furnished'], amenities: ['Gym'] })
    expect(params).not.toHaveProperty('radius')
  })

  it('keeps numeric filters inside the backend bounds and drops the rest', () => {
    const { result } = renderHook(() => usePropertyListQuery('acct', 'admin'))
    act(() => result.current.setFilters({ bedroomsMin: '3.7', bedroomsMax: '99', priceMin: '-5', priceMax: '2500000', windowsMin: '101' }))
    const params = result.current.params
    expect(params.bedrooms_min).toBe(3)
    expect(params).not.toHaveProperty('bedrooms_max')
    expect(params).not.toHaveProperty('price_min')
    expect(params.price_max).toBe(2500000)
    expect(params).not.toHaveProperty('windows_min')
  })
})
