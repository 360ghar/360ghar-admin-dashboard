import { describe, expect, it } from 'vitest'
import spec from '../../../../openapi/openapi.json'
import type { PmProperty } from '@/types/pm'
import {
  DUPLICATE_KEYS,
  PROPERTY_FIELDS,
  TERM_KEYS,
  buildCreateBody,
  buildUpdateBody,
  emptyPropertyValues,
  fieldKeysFor,
  parseLateFeePolicy,
  validatePropertyValues,
  valuesFromProperty,
  type PropertyFormValues,
} from '../propertyForm'

/** The declared body keys of a request schema in the OpenAPI document. */
function declaredKeys(schema: string): string[] {
  const schemas = spec.components.schemas as Record<string, unknown>
  const properties = (schemas[schema] as { properties: Record<string, unknown> }).properties
  return Object.keys(properties)
}

const PM_TERMS = ['management_status', 'payment_due_day', 'grace_period_days', 'late_fee_policy']

describe('property field catalogue', () => {
  it('covers every field that ManagedPropertyCreate declares', () => {
    const covered = new Set<string>([...fieldKeysFor('create'), ...PM_TERMS, 'owner_id'])
    expect(declaredKeys('ManagedPropertyCreate').filter((key) => !covered.has(key))).toEqual([])
  })

  it('covers every field that ManagedPropertyUpdate declares', () => {
    // `images` is the PM spelling of `image_urls`: one control sends `image_urls`.
    const covered = new Set<string>([...fieldKeysFor('edit'), ...PM_TERMS, ...DUPLICATE_KEYS])
    expect(declaredKeys('ManagedPropertyUpdate').filter((key) => !covered.has(key))).toEqual([])
  })

  it('names no field that the backend does not declare (the body would give 422)', () => {
    const create = new Set(declaredKeys('ManagedPropertyCreate'))
    const update = new Set(declaredKeys('ManagedPropertyUpdate'))
    expect(fieldKeysFor('create').filter((key) => !create.has(key))).toEqual([])
    expect(fieldKeysFor('edit').filter((key) => !update.has(key))).toEqual([])
  })

  it('keeps the PM term values in the form defaults', () => {
    const values = emptyPropertyValues()
    for (const key of TERM_KEYS) expect(values).toHaveProperty(key)
    for (const key of Object.keys(PROPERTY_FIELDS)) expect(values).toHaveProperty(key)
  })
})

describe('validatePropertyValues', () => {
  const valid = (): PropertyFormValues => ({ ...emptyPropertyValues(), title: 'Flat', base_price: '25000' })

  it('accepts the minimum create form', () => {
    expect(validatePropertyValues(valid(), 'create')).toEqual({})
  })

  it('requires title and base price on create', () => {
    const errors = validatePropertyValues({ ...valid(), title: '', base_price: '' }, 'create')
    expect(Object.keys(errors).sort()).toEqual(['base_price', 'title'])
  })

  it('maps the PG and flatmate purpose rule to the purpose field', () => {
    expect(validatePropertyValues({ ...valid(), property_type: 'pg', purpose: 'buy' }, 'create').purpose).toMatch(/rent/)
    expect(validatePropertyValues({ ...valid(), property_type: 'flatmate', purpose: 'rent' }, 'create')).toEqual({})
  })

  it('checks numeric bounds and kinds', () => {
    expect(validatePropertyValues({ ...valid(), minimum_stay_days: '0' }, 'create').minimum_stay_days).toBeDefined()
    expect(validatePropertyValues({ ...valid(), floor_number: '-6' }, 'create').floor_number).toBeDefined()
    expect(validatePropertyValues({ ...valid(), floor_number: '-5' }, 'create')).toEqual({})
    expect(validatePropertyValues({ ...valid(), base_price: '10000000000' }, 'create').base_price).toBeDefined()
    expect(validatePropertyValues({ ...valid(), available_from: '31/12/2026' }, 'create').available_from).toBeDefined()
  })
})

describe('validatePropertyValues on edit', () => {
  it('does not let an unchanged legacy value block saving another field', () => {
    const initial = { ...valuesFromProperty(property), bedrooms: '99', main_image_url: 'not-a-url' }
    expect(validatePropertyValues({ ...initial, title: 'Renamed' }, 'edit', initial)).toEqual({})
    // The same values are rejected when the user touches the bad field, or on create.
    expect(validatePropertyValues({ ...initial, bedrooms: '98' }, 'edit', initial).bedrooms).toBeDefined()
    expect(validatePropertyValues(initial, 'edit').bedrooms).toBeDefined()
  })

  it('still rejects emptying a required field and a PG listing that turns into a sale', () => {
    const initial = valuesFromProperty(property)
    expect(validatePropertyValues({ ...initial, title: '' }, 'edit', initial).title).toBeDefined()
    expect(validatePropertyValues({ ...initial, property_type: 'pg', purpose: 'buy' }, 'edit', initial).purpose).toBeDefined()
  })

  it('checks the late fee only when it changed', () => {
    const initial = { ...valuesFromProperty(property), late_fee_type: 'fixed', late_fee_amount: '' }
    expect(validatePropertyValues({ ...initial }, 'edit', initial)).toEqual({})
    expect(validatePropertyValues({ ...initial, late_fee_amount: '-1' }, 'edit', initial).late_fee_amount).toBeDefined()
  })
})

describe('buildCreateBody', () => {
  it('sends only the filled fields and the PM terms, with the owner in the body', () => {
    const body = buildCreateBody({ ...emptyPropertyValues(), title: ' Flat ', base_price: '25000', bedrooms: '2', city: '' }, 7)
    expect(body).toEqual({
      owner_id: 7,
      title: 'Flat',
      property_type: 'apartment',
      purpose: 'rent',
      base_price: 25000,
      // A rent listing needs a monthly rent: it defaults to the base price.
      monthly_rent: 25000,
      country: 'India',
      minimum_stay_days: 1,
      bedrooms: 2,
      management_status: 'active',
      payment_due_day: 1,
      grace_period_days: 5,
    })
  })

  it('keeps an explicit monthly rent and does not add one for a sale listing', () => {
    const rent = buildCreateBody({ ...emptyPropertyValues(), title: 'F', base_price: '100', monthly_rent: '90' }, 1)
    expect(rent.monthly_rent).toBe(90)
    const sale = buildCreateBody({ ...emptyPropertyValues(), title: 'F', base_price: '100', purpose: 'buy' }, 1)
    expect(sale).not.toHaveProperty('monthly_rent')
  })

  it('parses lists, ids, JSON, booleans and the late fee policy', () => {
    const body = buildCreateBody(
      {
        ...emptyPropertyValues(),
        title: 'F',
        base_price: '1',
        features: 'Lift\n  Gym \n',
        amenity_ids: '3,5',
        calendar_data: '{"blocked": []}',
        is_available: 'false',
        late_fee_type: 'percentage',
        late_fee_percent: '2.5',
      },
      1,
    )
    expect(body).toMatchObject({
      features: ['Lift', 'Gym'],
      amenity_ids: [3, 5],
      calendar_data: { blocked: [] },
      is_available: false,
      late_fee_policy: { type: 'percentage', percent: 2.5 },
    })
  })

  it('never sends a key the create schema does not declare', () => {
    const everything: PropertyFormValues = { ...emptyPropertyValues(), title: 'F', base_price: '1' }
    for (const key of fieldKeysFor('create')) if (!everything[key]) everything[key] = PROPERTY_FIELDS[key].kind === 'int' || PROPERTY_FIELDS[key].kind === 'decimal' ? '1' : PROPERTY_FIELDS[key].kind === 'boolean' ? 'true' : PROPERTY_FIELDS[key].kind === 'date' ? '2026-01-01' : PROPERTY_FIELDS[key].kind === 'amenities' ? '1' : PROPERTY_FIELDS[key].kind === 'json' ? '{}' : PROPERTY_FIELDS[key].kind === 'select' ? PROPERTY_FIELDS[key].options?.[0] ?? '' : PROPERTY_FIELDS[key].url ? 'https://a.example/x' : 'x'
    const declared = new Set(declaredKeys('ManagedPropertyCreate'))
    expect(Object.keys(buildCreateBody(everything, 1)).filter((key) => !declared.has(key))).toEqual([])
  })
})

const property: PmProperty = {
  id: 5,
  owner_id: 7,
  title: 'Flat',
  description: null,
  property_type: 'apartment',
  purpose: 'rent',
  status: 'available',
  base_price: 25000,
  monthly_rent: 25000,
  city: 'Pune',
  country: 'India',
  minimum_stay_days: 1,
  is_available: true,
  view_count: 0,
  like_count: 0,
  interest_count: 0,
  management_status: 'active',
  payment_due_day: 5,
  grace_period_days: 3,
  late_fee_policy: { type: 'fixed', amount: 500 },
  owner_contact: '+91 90000 00000',
  features: ['Lift'],
  amenities: [{ id: 9, title: 'Gym' }],
  images: [
    { id: 1, property_id: 5, image_url: 'https://a.example/1.jpg', image_category: 'others' },
    { id: 2, property_id: 5, image_url: 'https://a.example/plan.jpg', image_category: 'floor_plan' },
  ],
  listing_preferences: { gender_preference: 'female', moderation_status: 'live' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('valuesFromProperty and buildUpdateBody', () => {
  it('reads the stored property into form values', () => {
    const values = valuesFromProperty(property)
    expect(values).toMatchObject({
      title: 'Flat',
      base_price: '25000',
      features: 'Lift',
      amenity_ids: '9',
      image_urls: 'https://a.example/1.jpg',
      floor_plans: 'https://a.example/plan.jpg',
      gender_preference: 'female',
      payment_due_day: '5',
      grace_period_days: '3',
      late_fee_type: 'fixed',
      late_fee_amount: '500',
    })
  })

  it('sends an empty body when nothing changed, so a masked owner contact is never written back', () => {
    const initial = valuesFromProperty(property)
    expect(buildUpdateBody({ ...initial }, initial)).toEqual({})
  })

  it('sends only the changed fields', () => {
    const initial = valuesFromProperty(property)
    const body = buildUpdateBody({ ...initial, title: 'New title', bedrooms: '3', payment_due_day: '10' }, initial)
    expect(body).toEqual({ title: 'New title', bedrooms: 3, payment_due_day: 10 })
  })

  it('clears a nullable field with null and leaves a required one out', () => {
    const initial = valuesFromProperty(property)
    const body = buildUpdateBody({ ...initial, city: '', features: '', title: '' }, initial)
    expect(body).toEqual({ city: null, features: null })
  })

  it('sends the late fee policy when its type changes and clears it with null', () => {
    const initial = valuesFromProperty(property)
    expect(buildUpdateBody({ ...initial, late_fee_type: 'percentage', late_fee_percent: '2' }, initial)).toEqual({
      late_fee_policy: { type: 'percentage', percent: 2 },
    })
    expect(buildUpdateBody({ ...initial, late_fee_type: 'none' }, initial)).toEqual({ late_fee_policy: null })
  })

  it('never sends a key the update schema does not declare', () => {
    const initial = valuesFromProperty(property)
    const changed: PropertyFormValues = { ...initial }
    for (const key of fieldKeysFor('edit')) changed[key] = changed[key] === 'x' ? 'y' : 'x'
    changed.late_fee_type = 'none'
    const declared = new Set(declaredKeys('ManagedPropertyUpdate'))
    expect(Object.keys(buildUpdateBody(changed, initial)).filter((key) => !declared.has(key))).toEqual([])
  })
})

describe('parseLateFeePolicy', () => {
  it('reads a fixed amount and a percentage', () => {
    expect(parseLateFeePolicy({ type: 'fixed', amount: 500 })).toEqual({ type: 'fixed', amount: '500', percent: '' })
    expect(parseLateFeePolicy({ type: 'percentage', percent: 2 })).toEqual({ type: 'percentage', amount: '', percent: '2' })
  })

  it('treats anything else as no late fee', () => {
    for (const value of [null, undefined, {}, [], 'x', { type: 'flat' }]) {
      expect(parseLateFeePolicy(value).type).toBe('none')
    }
  })
})
