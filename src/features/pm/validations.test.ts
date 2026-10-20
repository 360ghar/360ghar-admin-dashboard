import { describe, it, expect } from 'vitest'
import {
  pmChargeGenerateSchema,
  pmExpenseCreateSchema,
  pmLeaseCreateSchema,
  pmMaintenanceUpdateSchema,
  pmLeaseTerminateSchema,
  pmPropertyFormSchema,
  pmRentPaymentSchema,
} from '@/features/pm/validations'
import { emptyPropertyValues } from '@/features/pm/propertyForm'
import { PAYMENT_METHODS } from '@/features/pm/constants'

describe('pmPropertyFormSchema', () => {
  const create = pmPropertyFormSchema('create')
  const base = {
    ...emptyPropertyValues(),
    title: '2BHK',
    property_type: 'apartment',
    purpose: 'rent',
    base_price: '25000',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    payment_due_day: '5',
    grace_period_days: '5',
  }

  it('accepts a valid payload', () => {
    expect(create.safeParse(base).success).toBe(true)
  })

  it('requires a title and a positive base price on create', () => {
    expect(create.safeParse({ ...base, title: '' }).success).toBe(false)
    expect(create.safeParse({ ...base, base_price: '' }).success).toBe(false)
    expect(create.safeParse({ ...base, base_price: '-1' }).success).toBe(false)
  })

  it('rejects payment due day outside 1-28', () => {
    expect(create.safeParse({ ...base, payment_due_day: '0' }).success).toBe(false)
    expect(create.safeParse({ ...base, payment_due_day: '29' }).success).toBe(false)
    expect(create.safeParse({ ...base, payment_due_day: '28' }).success).toBe(true)
  })

  it('accepts a grace period up to the backend maximum of 365 days', () => {
    expect(create.safeParse({ ...base, grace_period_days: '365' }).success).toBe(true)
    expect(create.safeParse({ ...base, grace_period_days: '366' }).success).toBe(false)
    expect(create.safeParse({ ...base, grace_period_days: '-1' }).success).toBe(false)
  })

  it('requires an amount for a fixed late fee and a 0 to 100 percentage', () => {
    expect(create.safeParse({ ...base, late_fee_type: 'fixed', late_fee_amount: '' }).success).toBe(false)
    expect(create.safeParse({ ...base, late_fee_type: 'fixed', late_fee_amount: '500' }).success).toBe(true)
    expect(create.safeParse({ ...base, late_fee_type: 'percentage', late_fee_percent: '101' }).success).toBe(false)
    expect(create.safeParse({ ...base, late_fee_type: 'percentage', late_fee_percent: '2.5' }).success).toBe(true)
  })

  it('rejects a PG or flatmate listing with a purpose other than rent', () => {
    const result = create.safeParse({ ...base, property_type: 'pg', purpose: 'buy' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((i) => i.path.join('.'))).toContain('purpose')
    expect(create.safeParse({ ...base, property_type: 'flatmate', purpose: 'short_stay' }).success).toBe(false)
    expect(create.safeParse({ ...base, property_type: 'pg', purpose: 'rent' }).success).toBe(true)
  })

  it('accepts a valid daily rate and empty value, and rejects a negative one', () => {
    expect(create.safeParse({ ...base, daily_rate: '1500' }).success).toBe(true)
    expect(create.safeParse({ ...base, daily_rate: '' }).success).toBe(true)
    expect(create.safeParse({ ...base, daily_rate: '-1' }).success).toBe(false)
  })

  it('validates bounds, URLs and JSON objects', () => {
    expect(create.safeParse({ ...base, bedrooms: '51' }).success).toBe(false)
    expect(create.safeParse({ ...base, bedrooms: '2.5' }).success).toBe(false)
    expect(create.safeParse({ ...base, latitude: '91' }).success).toBe(false)
    expect(create.safeParse({ ...base, main_image_url: 'not a url' }).success).toBe(false)
    expect(create.safeParse({ ...base, image_urls: 'https://a.example/1.jpg\nhttps://a.example/2.jpg' }).success).toBe(true)
    expect(create.safeParse({ ...base, calendar_data: '{not-json' }).success).toBe(false)
    expect(create.safeParse({ ...base, calendar_data: '[1]' }).success).toBe(false)
    expect(create.safeParse({ ...base, calendar_data: '{"a": 1}' }).success).toBe(true)
  })

  it('does not let an edit empty a field the backend never sets to null', () => {
    const edit = pmPropertyFormSchema('edit')
    expect(edit.safeParse({ ...base, title: '' }).success).toBe(false)
    expect(edit.safeParse({ ...base, city: '' }).success).toBe(true)
  })
})

describe('pmLeaseCreateSchema', () => {
  const base = {
    property_id: '10',
    status: 'draft',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    monthly_rent: '25000',
    security_deposit: '50000',
  }

  it('accepts a lease with no billing terms (the property settings apply)', () => {
    expect(pmLeaseCreateSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a zero security deposit', () => {
    expect(pmLeaseCreateSchema.safeParse({ ...base, security_deposit: '0' }).success).toBe(true)
    expect(pmLeaseCreateSchema.safeParse({ ...base, security_deposit: '-1' }).success).toBe(false)
  })

  it('bounds the due day, grace period and late fee to the lease fields', () => {
    expect(pmLeaseCreateSchema.safeParse({ ...base, payment_due_day: '29' }).success).toBe(false)
    expect(pmLeaseCreateSchema.safeParse({ ...base, payment_due_day: '28', grace_period_days: '0' }).success).toBe(true)
    expect(pmLeaseCreateSchema.safeParse({ ...base, grace_period_days: '-1' }).success).toBe(false)
    expect(pmLeaseCreateSchema.safeParse({ ...base, late_fee_amount: '-5' }).success).toBe(false)
    expect(pmLeaseCreateSchema.safeParse({ ...base, late_fee_percentage: '101' }).success).toBe(false)
    expect(pmLeaseCreateSchema.safeParse({ ...base, late_fee_percentage: '2' }).success).toBe(true)
  })
})

describe('pmRentPaymentSchema', () => {
  const base = { amount_paid: '100', payment_method: 'cash' }

  it('offers exactly the backend payment methods', () => {
    expect(PAYMENT_METHODS.map((m) => m.value)).toEqual(['cash', 'bank_transfer', 'upi', 'cheque', 'online', 'other'])
  })

  it('accepts each backend payment method and rejects card', () => {
    for (const { value } of PAYMENT_METHODS) {
      expect(pmRentPaymentSchema.safeParse({ ...base, payment_method: value }).success).toBe(true)
    }
    expect(pmRentPaymentSchema.safeParse({ ...base, payment_method: 'card' }).success).toBe(false)
  })
})

describe('pmExpenseCreateSchema', () => {
  it('accepts an optional title up to 200 characters', () => {
    const base = { property_id: '1', category: 'repairs', amount: '10', expense_date: '2026-01-01' }
    expect(pmExpenseCreateSchema.safeParse(base).success).toBe(true)
    expect(pmExpenseCreateSchema.safeParse({ ...base, title: 'x'.repeat(200) }).success).toBe(true)
    expect(pmExpenseCreateSchema.safeParse({ ...base, title: 'x'.repeat(201) }).success).toBe(false)
  })
})

describe('pmChargeGenerateSchema', () => {
  it('requires months between 1 and 24', () => {
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '12' }).success).toBe(true)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '25' }).success).toBe(false)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '0' }).success).toBe(false)
  })

  it('accepts a blank start month or a YYYY-MM month', () => {
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '1', start_month: '' }).success).toBe(true)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '1', start_month: '2026-10' }).success).toBe(true)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '1', start_month: '2026-13' }).success).toBe(false)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '1', start_month: '2026-10-05' }).success).toBe(false)
  })
})

describe('pmMaintenanceUpdateSchema', () => {
  const base = { request_status: 'open', assign_to_me: 'no', urgency: 'medium' }

  it('rejects negative estimated cost', () => {
    expect(pmMaintenanceUpdateSchema.safeParse({ ...base, estimated_cost: '-5' }).success).toBe(false)
  })

  it('accepts empty optional cost fields', () => {
    expect(
      pmMaintenanceUpdateSchema.safeParse({ ...base, request_status: 'resolved', assign_to_me: 'yes', estimated_cost: '' }).success,
    ).toBe(true)
  })

  it('takes an urgency from the backend enum (the backend has no priority)', () => {
    expect(pmMaintenanceUpdateSchema.safeParse({ ...base, urgency: 'emergency' }).success).toBe(true)
    expect(pmMaintenanceUpdateSchema.safeParse({ ...base, urgency: 'P1' }).success).toBe(false)
  })

  it('accepts vendor name and contact', () => {
    expect(
      pmMaintenanceUpdateSchema.safeParse({
        ...base,
        request_status: 'resolved',
        vendor_name: 'ACME Plumbing',
        vendor_contact: '+91 98765 43210',
      }).success,
    ).toBe(true)
  })
})

describe('pmLeaseTerminateSchema', () => {
  it('accepts empty values (backend body is optional)', () => {
    expect(pmLeaseTerminateSchema.safeParse({ termination_date: '', reason: '' }).success).toBe(true)
    expect(pmLeaseTerminateSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a termination date and reason', () => {
    expect(
      pmLeaseTerminateSchema.safeParse({
        termination_date: '2026-08-15',
        reason: 'Early move-out',
      }).success,
    ).toBe(true)
  })
})
