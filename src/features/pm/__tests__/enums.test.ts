import { describe, expect, it } from 'vitest'
import spec from '../../../../openapi/openapi.json'
import {
  APPLICATION_FIELD_TYPES,
  APPLICATION_STATUSES,
  DOCUMENT_TYPES,
  EXPENSE_CATEGORIES,
  INSPECTION_TYPES,
  LEASE_STATUSES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_REQUEST_STATUSES,
  MAINTENANCE_URGENCIES,
  MANAGED_PROPERTY_STATUSES,
  OCCUPYING_LEASE_STATUSES,
  PAYMENT_METHODS,
  RENEWABLE_LEASE_STATUSES,
  RENT_CHARGE_STATUSES,
  RENT_PAYMENT_STATUSES,
  TERMINATABLE_LEASE_STATUSES,
  VALIDATION,
  WORK_ORDER_STATUSES,
} from '../constants'

/** The wire values of a named enum in the OpenAPI document. */
function wireValues(name: string): string[] {
  const schemas = spec.components.schemas as Record<string, unknown>
  return (schemas[name] as { enum: string[] }).enum
}

const values = (options: { value: string }[]) => options.map((o) => o.value)

describe('PM option lists match the backend enums', () => {
  it.each([
    ['LeaseStatus', LEASE_STATUSES],
    ['RentChargeStatus', RENT_CHARGE_STATUSES],
    ['RentPaymentStatus', RENT_PAYMENT_STATUSES],
    ['PaymentMethod', PAYMENT_METHODS],
    ['RentalApplicationStatus', APPLICATION_STATUSES],
    ['ApplicationFieldType', APPLICATION_FIELD_TYPES],
    ['ExpenseCategory', EXPENSE_CATEGORIES],
    ['MaintenanceCategory', MAINTENANCE_CATEGORIES],
    ['MaintenanceUrgency', MAINTENANCE_URGENCIES],
    ['MaintenanceRequestStatus', MAINTENANCE_REQUEST_STATUSES],
    ['WorkOrderStatus', WORK_ORDER_STATUSES],
    ['DocumentType', DOCUMENT_TYPES],
    ['InspectionType', INSPECTION_TYPES],
    ['ManagedPropertyStatus', MANAGED_PROPERTY_STATUSES],
  ])('%s', (name, options) => {
    expect(values(options).sort()).toEqual([...wireValues(name)].sort())
  })

  it('lists the expiring_soon and expired lease states', () => {
    expect(values(LEASE_STATUSES)).toEqual(expect.arrayContaining(['expiring_soon', 'expired']))
  })

  it('lets an expiring_soon lease be renewed, terminated and count as occupying', () => {
    expect(RENEWABLE_LEASE_STATUSES).toEqual(['active', 'expiring_soon'])
    expect(OCCUPYING_LEASE_STATUSES).toEqual(['active', 'expiring_soon'])
    expect(TERMINATABLE_LEASE_STATUSES).toContain('expiring_soon')
    expect(RENEWABLE_LEASE_STATUSES).not.toContain('expired')
  })

  it('keeps the page size limit at the backend maximum', () => {
    expect(VALIDATION.PAGINATION_LIMIT_MAX).toBe(100)
  })
})
