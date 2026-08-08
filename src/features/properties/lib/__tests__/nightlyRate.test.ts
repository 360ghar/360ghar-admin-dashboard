import { describe, it, expect } from 'vitest'
import { deriveNightlyRate } from '@/features/properties/lib/nightlyRate'

describe('deriveNightlyRate', () => {
  it('prefers daily_rate when present and positive', () => {
    expect(deriveNightlyRate({ daily_rate: 1000, monthly_rent: 30000, base_price: 900000 })).toBe(1000)
  })

  it('falls back to monthly_rent / 30', () => {
    expect(deriveNightlyRate({ monthly_rent: 30000 })).toBe(1000)
    expect(deriveNightlyRate({ monthly_rent: 45000, base_price: 900000 })).toBe(1500)
  })

  it('falls back to base_price / 30', () => {
    expect(deriveNightlyRate({ base_price: 900000 })).toBe(30000)
  })

  it('returns null when no usable rate exists', () => {
    expect(deriveNightlyRate({})).toBeNull()
    expect(deriveNightlyRate({ daily_rate: null, monthly_rent: null, base_price: null })).toBeNull()
  })

  it('treats a present non-positive daily_rate as no valid rate (backend parity)', () => {
    expect(deriveNightlyRate({ daily_rate: 0, monthly_rent: 30000 })).toBeNull()
    expect(deriveNightlyRate({ daily_rate: -5, monthly_rent: 30000 })).toBeNull()
  })

  it('treats a non-positive monthly_rent as no valid rate (backend parity)', () => {
    expect(deriveNightlyRate({ monthly_rent: 0, base_price: 300000 })).toBeNull()
    expect(deriveNightlyRate({ monthly_rent: -30000 })).toBeNull()
  })

  it('guards against NaN values', () => {
    expect(deriveNightlyRate({ daily_rate: Number.NaN })).toBeNull()
    expect(deriveNightlyRate({ daily_rate: Number.NaN, monthly_rent: 30000 })).toBe(1000)
    expect(deriveNightlyRate({ monthly_rent: Number.NaN, base_price: 900000 })).toBe(30000)
    expect(deriveNightlyRate({ base_price: Number.NaN })).toBeNull()
  })
})
