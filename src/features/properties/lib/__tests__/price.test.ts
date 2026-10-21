import { describe, it, expect } from 'vitest'
import { purposePrice } from '@/features/properties/lib/price'

describe('purposePrice', () => {
  it('uses monthly_rent for a rent listing', () => {
    expect(purposePrice({ purpose: 'rent', monthly_rent: 45000, base_price: 1 })).toEqual({ amount: 45000, unit: '/month' })
  })

  it('uses nightly_rate, then daily_rate, for a short stay', () => {
    expect(purposePrice({ purpose: 'short_stay', nightly_rate: 2500, daily_rate: 2500, base_price: 1 })).toEqual({ amount: 2500, unit: '/night' })
    expect(purposePrice({ purpose: 'short_stay', daily_rate: 1800, base_price: 1 })).toEqual({ amount: 1800, unit: '/night' })
  })

  it('uses base_price for a sale and as the fallback', () => {
    expect(purposePrice({ purpose: 'buy', base_price: 9000000 })).toEqual({ amount: 9000000, unit: '' })
    expect(purposePrice({ purpose: 'rent', monthly_rent: null, base_price: 7000 })).toEqual({ amount: 7000, unit: '/month' })
    expect(purposePrice({ purpose: 'short_stay', base_price: 7000 })).toEqual({ amount: 7000, unit: '' })
  })
})
