import { describe, it, expect } from 'vitest'
import { propertyFormSchema, propertyFormPageSchema, propertySearchSchema } from '@/features/properties/validations'

const base = {
  title: 'Spacious 2BHK in Gurgaon',
  property_type: 'apartment',
  purpose: 'rent',
  base_price: 50000,
  city: 'Gurgaon',
  locality: 'DLF Phase 2',
  area_sqft: 1200,
}

const fullListingFields = {
  monthly_rent: 45000,
  daily_rate: 1500,
  kitchen_type: 'vegetarian',
  ventilation_type: 'good',
  furnishing_level: 'furnished',
  windows_count: 10,
  ventilation_shafts: 5,
  setup_cost: 5000,
  other_charges: 2000,
  other_charges_description: 'Maintenance + parking charges',
}

describe('propertyFormSchema', () => {
  it('accepts a valid payload with all listing/pricing fields', () => {
    expect(propertyFormSchema.safeParse({ ...base, ...fullListingFields }).success).toBe(true)
  })

  it('accepts a valid payload without the optional listing fields', () => {
    expect(propertyFormSchema.safeParse(base).success).toBe(true)
  })

  it.each([
    ['kitchen_type', 'foo'],
    ['ventilation_type', 'foo'],
    ['furnishing_level', 'foo'],
  ])('rejects invalid %s enum value', (field, value) => {
    expect(propertyFormSchema.safeParse({ ...base, [field]: value }).success).toBe(false)
  })

  it.each([
    ['windows_count', 101],
    ['windows_count', -1],
    ['ventilation_shafts', 51],
    ['ventilation_shafts', -1],
    ['setup_cost', -1],
    ['other_charges', -1],
    ['daily_rate', -1],
  ])('rejects out-of-bounds %s = %s', (field, value) => {
    expect(propertyFormSchema.safeParse({ ...base, [field]: value }).success).toBe(false)
  })

  it('accepts boundary values for windows_count and ventilation_shafts', () => {
    expect(propertyFormSchema.safeParse({ ...base, windows_count: 100 }).success).toBe(true)
    expect(propertyFormSchema.safeParse({ ...base, windows_count: 0 }).success).toBe(true)
    expect(propertyFormSchema.safeParse({ ...base, ventilation_shafts: 50 }).success).toBe(true)
    expect(propertyFormSchema.safeParse({ ...base, ventilation_shafts: 0 }).success).toBe(true)
  })

  it('rejects other_charges_description longer than 300 characters and accepts exactly 300', () => {
    expect(propertyFormSchema.safeParse({ ...base, other_charges_description: 'x'.repeat(301) }).success).toBe(false)
    expect(propertyFormSchema.safeParse({ ...base, other_charges_description: 'x'.repeat(300) }).success).toBe(true)
  })
})

describe('propertyFormPageSchema (parity with live schema)', () => {
  it('accepts the same valid payload with all listing/pricing fields', () => {
    expect(propertyFormPageSchema.safeParse({ ...base, ...fullListingFields }).success).toBe(true)
  })

  it('rejects invalid enum values and out-of-bounds numbers', () => {
    expect(propertyFormPageSchema.safeParse({ ...base, kitchen_type: 'foo' }).success).toBe(false)
    expect(propertyFormPageSchema.safeParse({ ...base, windows_count: 101 }).success).toBe(false)
    expect(propertyFormPageSchema.safeParse({ ...base, setup_cost: -1 }).success).toBe(false)
    expect(propertyFormPageSchema.safeParse({ ...base, daily_rate: -1 }).success).toBe(false)
  })
})

describe('propertySearchSchema', () => {
  it('accepts listing-detail filter arrays plus windows_min and has_lift', () => {
    const result = propertySearchSchema.safeParse({
      furnishing: ['furnished'],
      kitchen_type: ['vegetarian'],
      ventilation_type: ['good'],
      windows_min: 3,
      has_lift: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty payload (all fields optional)', () => {
    expect(propertySearchSchema.safeParse({}).success).toBe(true)
  })

  it('rejects a non-number windows_min', () => {
    expect(propertySearchSchema.safeParse({ windows_min: 'abc' }).success).toBe(false)
    expect(propertySearchSchema.safeParse({ windows_min: '3' }).success).toBe(false)
  })

  it('rejects a non-boolean has_lift', () => {
    expect(propertySearchSchema.safeParse({ has_lift: 'true' }).success).toBe(false)
  })
})
