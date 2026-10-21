import type { Property } from '@/types/api'

/**
 * The price a listing is shown with depends on its purpose: rent uses `monthly_rent`,
 * short stay uses `nightly_rate` (the daily rate), buy uses `base_price`. A missing purpose
 * price falls back to `base_price`, which the backend always sends.
 */
export interface PurposePrice {
  amount: number | null
  /** Suffix for display: per month, per night, or nothing for a sale price. */
  unit: '/month' | '/night' | ''
}

type PriceSource = Pick<Property, 'purpose' | 'monthly_rent' | 'daily_rate' | 'nightly_rate' | 'base_price'>

export function purposePrice(property: PriceSource): PurposePrice {
  if (property.purpose === 'rent' && property.monthly_rent != null) return { amount: property.monthly_rent, unit: '/month' }
  if (property.purpose === 'short_stay') {
    const nightly = property.nightly_rate ?? property.daily_rate
    if (nightly != null) return { amount: nightly, unit: '/night' }
  }
  // For a rent listing `base_price` is the monthly rent anchor, so it keeps the month suffix.
  return { amount: property.base_price ?? null, unit: property.purpose === 'rent' ? '/month' : '' }
}
