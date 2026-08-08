import { describe, it, expect } from 'vitest'
import {
  pmPropertyCreateSchema,
  pmSettingsSchema,
  pmChargeGenerateSchema,
  pmMaintenanceUpdateSchema,
  pmLeaseTerminateSchema,
} from '@/features/pm/validations'

describe('pmPropertyCreateSchema', () => {
  const base = {
    title: '2BHK',
    property_type: 'apartment',
    purpose: 'rent',
    base_price: '25000',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    full_address: '',
    management_status: 'active',
    payment_due_day: '5',
    grace_days: '5',
    late_fee_policy_json: '',
  }

  it('accepts a valid payload', () => {
    expect(pmPropertyCreateSchema.safeParse(base).success).toBe(true)
  })

  it('rejects payment due day outside 1-28', () => {
    expect(pmPropertyCreateSchema.safeParse({ ...base, payment_due_day: '0' }).success).toBe(false)
    expect(pmPropertyCreateSchema.safeParse({ ...base, payment_due_day: '29' }).success).toBe(false)
    expect(pmPropertyCreateSchema.safeParse({ ...base, payment_due_day: '28' }).success).toBe(true)
  })

  it('rejects grace days above 30', () => {
    expect(pmPropertyCreateSchema.safeParse({ ...base, grace_days: '31' }).success).toBe(false)
    expect(pmPropertyCreateSchema.safeParse({ ...base, grace_days: '30' }).success).toBe(true)
  })

  it('rejects invalid JSON in late fee policy', () => {
    expect(
      pmPropertyCreateSchema.safeParse({ ...base, late_fee_policy_json: '{not-json' }).success,
    ).toBe(false)
    expect(
      pmPropertyCreateSchema.safeParse({ ...base, late_fee_policy_json: '{"flat": 500}' }).success,
    ).toBe(true)
  })

  it('rejects non-positive base price', () => {
    expect(pmPropertyCreateSchema.safeParse({ ...base, base_price: '0' }).success).toBe(false)
  })

  it('accepts a valid daily rate and empty value', () => {
    expect(pmPropertyCreateSchema.safeParse({ ...base, daily_rate: '1500' }).success).toBe(true)
    expect(pmPropertyCreateSchema.safeParse({ ...base, daily_rate: '' }).success).toBe(true)
  })

  it('rejects negative daily rate', () => {
    expect(pmPropertyCreateSchema.safeParse({ ...base, daily_rate: '-1' }).success).toBe(false)
  })
})

describe('pmSettingsSchema', () => {
  it('enforces payment due day 1-28 and grace 0-30', () => {
    expect(pmSettingsSchema.safeParse({
      payment_due_day: 5, grace_period_days: 5, late_fee_enabled: false,
      auto_generate_charges: false, notify_owner_on_payment: false,
      notify_tenant_on_charge: false, default_lease_term_months: 12,
    }).success).toBe(true)
    expect(pmSettingsSchema.safeParse({
      payment_due_day: 0, grace_period_days: 5, late_fee_enabled: false,
      auto_generate_charges: false, notify_owner_on_payment: false,
      notify_tenant_on_charge: false, default_lease_term_months: 12,
    }).success).toBe(false)
    expect(pmSettingsSchema.safeParse({
      payment_due_day: 5, grace_period_days: 31, late_fee_enabled: false,
      auto_generate_charges: false, notify_owner_on_payment: false,
      notify_tenant_on_charge: false, default_lease_term_months: 12,
    }).success).toBe(false)
  })

  it('caps late fee percent at 100', () => {
    expect(pmSettingsSchema.safeParse({
      payment_due_day: 5, grace_period_days: 5, late_fee_enabled: true,
      late_fee_percent: 101, auto_generate_charges: false,
      notify_owner_on_payment: false, notify_tenant_on_charge: false,
      default_lease_term_months: 12,
    }).success).toBe(false)
  })
})

describe('pmChargeGenerateSchema', () => {
  it('requires months between 1 and 24', () => {
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '12' }).success).toBe(true)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '25' }).success).toBe(false)
    expect(pmChargeGenerateSchema.safeParse({ scope: 'owner', months: '0' }).success).toBe(false)
  })
})

describe('pmMaintenanceUpdateSchema', () => {
  it('rejects negative estimated cost', () => {
    expect(
      pmMaintenanceUpdateSchema.safeParse({
        request_status: 'open', assign_to_me: 'no', estimated_cost: '-5',
      }).success,
    ).toBe(false)
  })

  it('accepts empty optional cost fields', () => {
    expect(
      pmMaintenanceUpdateSchema.safeParse({
        request_status: 'resolved', assign_to_me: 'yes', estimated_cost: '',
      }).success,
    ).toBe(true)
  })

  it('accepts vendor name and contact', () => {
    expect(
      pmMaintenanceUpdateSchema.safeParse({
        request_status: 'resolved',
        assign_to_me: 'no',
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
