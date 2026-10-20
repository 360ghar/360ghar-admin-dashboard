import { describe, expect, it } from 'vitest'
import { buildLeaseCreate } from '../leaseForm'
import { pmLeaseCreateSchema, type PmLeaseCreateForm } from '../validations'

const base: PmLeaseCreateForm = {
  property_id: '10',
  tenant_name: 'Asha',
  tenant_phone: '',
  tenant_email: '',
  status: 'draft',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  monthly_rent: '25000',
  security_deposit: '0',
}

describe('buildLeaseCreate', () => {
  it('leaves out a blank due day and grace period, so the backend copies the property settings', () => {
    const body = buildLeaseCreate({ ...base, payment_due_day: '', grace_period_days: '' }, 7)
    expect(body).toMatchObject({ owner_id: 7, property_id: 10, monthly_rent: 25000, security_deposit: 0 })
    expect(body.payment_due_day).toBeUndefined()
    expect(body.grace_period_days).toBeUndefined()
    expect(body.late_fee_amount).toBeUndefined()
    expect(body.late_fee_percentage).toBeUndefined()
  })

  it('sends the lease billing terms: due day, grace period and late fee', () => {
    const body = buildLeaseCreate(
      { ...base, payment_due_day: '5', grace_period_days: '0', late_fee_amount: '500', late_fee_percentage: '2' },
      undefined,
    )
    expect(body).toMatchObject({ payment_due_day: 5, grace_period_days: 0, late_fee_amount: 500, late_fee_percentage: 2 })
  })

  it('sends only declared lease keys', () => {
    const body = buildLeaseCreate({ ...base, payment_due_day: '5' }, 7)
    const declared = ['owner_id', 'property_id', 'tenant_name', 'tenant_phone', 'tenant_email', 'status', 'start_date', 'end_date',
      'monthly_rent', 'security_deposit', 'payment_due_day', 'grace_period_days', 'late_fee_amount', 'late_fee_percentage']
    expect(Object.keys(body).filter((key) => !declared.includes(key))).toEqual([])
  })

  it('accepts the form values the dialog produces', () => {
    expect(pmLeaseCreateSchema.safeParse({ ...base, payment_due_day: '5', grace_period_days: '0' }).success).toBe(true)
  })
})
