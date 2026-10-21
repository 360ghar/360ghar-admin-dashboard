import type { LeaseCreate } from '@/types/pm'
import type { PmLeaseCreateForm } from './validations'

/**
 * The create body of a lease. Billing reads the lease: its due day, grace period and late fee.
 * A blank due day or grace period is left out, so the backend copies the managed property's settings
 * (a grace period of 0 is sent, and stays 0). A fixed late fee wins over a percentage of the rent.
 */
export function buildLeaseCreate(values: PmLeaseCreateForm, ownerId: number | undefined): LeaseCreate {
  const optionalNumber = (raw: string | undefined) => (raw ? Number(raw) : undefined)
  return {
    owner_id: ownerId,
    property_id: Number(values.property_id),
    tenant_name: values.tenant_name || undefined,
    tenant_phone: values.tenant_phone || undefined,
    tenant_email: values.tenant_email || undefined,
    status: values.status,
    start_date: values.start_date,
    end_date: values.end_date,
    monthly_rent: Number(values.monthly_rent),
    security_deposit: Number(values.security_deposit),
    payment_due_day: optionalNumber(values.payment_due_day),
    grace_period_days: optionalNumber(values.grace_period_days),
    late_fee_amount: optionalNumber(values.late_fee_amount),
    late_fee_percentage: optionalNumber(values.late_fee_percentage),
  }
}
