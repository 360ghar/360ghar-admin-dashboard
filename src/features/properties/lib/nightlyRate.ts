/**
 * Derived per-night price mirroring the backend booking rate calculation
 * (360ghar-backend app/services/booking.py:497-502): prefer `daily_rate`,
 * else `monthly_rent / 30`, else `base_price / 30`. Returns null when no
 * usable (positive, finite) rate exists.
 */
export interface NightlyRateSource {
  daily_rate?: number | null
  monthly_rent?: number | null
  base_price?: number | null
}

export function deriveNightlyRate(source: NightlyRateSource): number | null {
  const { daily_rate, monthly_rent, base_price } = source
  const usable = (v: number | null | undefined): v is number => v != null && Number.isFinite(v)
  // Backend parity: the first present field wins; a non-positive present
  // value is treated as "no valid rate" (backend errors on it).
  if (usable(daily_rate)) return daily_rate > 0 ? daily_rate : null
  if (usable(monthly_rent)) {
    const rate = monthly_rent / 30
    return rate > 0 ? rate : null
  }
  if (usable(base_price)) {
    const rate = base_price / 30
    return rate > 0 ? rate : null
  }
  return null
}
