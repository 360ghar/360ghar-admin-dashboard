import { z } from 'zod'
import { isValidJson } from '@/lib/json'
import { VALIDATION } from './constants'

export const pmPropertyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  property_type: z.enum([
    'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo',
    'penthouse', 'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
  ]),
  purpose: z.enum(['rent', 'buy', 'short_stay']),
  base_price: z
    .string()
    .min(1, 'Base price is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Base price must be a positive number'),
  daily_rate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      'Daily rate must be a non-negative number',
    ),
  city: z.string().optional().or(z.literal('')),
  locality: z.string().optional().or(z.literal('')),
  full_address: z.string().optional().or(z.literal('')),
  management_status: z.enum(['draft', 'active', 'archived']),
  payment_due_day: z
    .string()
    .min(1, 'Payment due day is required')
    .refine(
      (v) => {
        const n = Number(v)
        return !isNaN(n) && n >= VALIDATION.PAYMENT_DUE_DAY_MIN && n <= VALIDATION.PAYMENT_DUE_DAY_MAX
      },
      `Payment due day must be between ${VALIDATION.PAYMENT_DUE_DAY_MIN} and ${VALIDATION.PAYMENT_DUE_DAY_MAX}`,
    ),
  grace_days: z
    .string()
    .min(1, 'Grace period is required')
    .refine(
      (v) => {
        const n = Number(v)
        return !isNaN(n) && n >= 0 && n <= 30
      },
      'Grace period must be between 0 and 30 days',
    ),
  late_fee_policy_json: z
    .string()
    .refine((v) => !v || isValidJson(v), 'Late fee policy must be valid JSON'),
})

export const pmLeaseCreateSchema = z
  .object({
    property_id: z.string().min(1, 'Property is required'),
    tenant_name: z.string().optional().or(z.literal('')),
    tenant_phone: z.string().optional().or(z.literal('')),
    tenant_email: z.string().optional().or(z.literal('')),
    status: z.enum(['draft', 'pending_signature', 'active']),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    monthly_rent: z
      .string()
      .min(1, 'Monthly rent is required')
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Monthly rent must be a positive number'),
    security_deposit: z
      .string()
      .min(1, 'Security deposit is required')
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Security deposit must be a positive number'),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  })

export const pmRentPaymentSchema = z.object({
  amount_paid: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export const pmExpenseCreateSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  category: z.enum([
    'maintenance',
    'repairs',
    'insurance',
    'property_tax',
    'hoa',
    'utilities',
    'marketing',
    'legal',
    'other',
  ]),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number'),
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export const pmExpenseUpdateSchema = z.object({
  category: z.enum([
    'maintenance',
    'repairs',
    'insurance',
    'property_tax',
    'hoa',
    'utilities',
    'marketing',
    'legal',
    'other',
  ]),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number'),
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export const pmMaintenanceRequestSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  category: z.enum([
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'structural',
    'pest_control',
    'cleaning',
    'other',
  ]),
  urgency: z.enum(['emergency', 'high', 'medium', 'low']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  preferred_contact_method: z.string().optional().or(z.literal('')),
  availability_notes: z.string().optional().or(z.literal('')),
})

export const pmInspectionCreateSchema = z.object({
  lease_id: z.string().min(1, 'Lease is required'),
  inspection_type: z.enum(['move_in', 'move_out', 'routine']),
  conducted_at: z.string().optional().or(z.literal('')),
  rooms_json: z
    .string()
    .refine((v) => !v || isValidJson(v), 'Rooms JSON must be valid'),
  overall_notes: z.string().optional().or(z.literal('')),
})

export type PmPropertyCreateForm = z.infer<typeof pmPropertyCreateSchema>
export type PmLeaseCreateForm = z.infer<typeof pmLeaseCreateSchema>
export type PmRentPaymentForm = z.infer<typeof pmRentPaymentSchema>
export type PmExpenseCreateForm = z.infer<typeof pmExpenseCreateSchema>
export type PmExpenseUpdateForm = z.infer<typeof pmExpenseUpdateSchema>
export type PmMaintenanceRequestForm = z.infer<typeof pmMaintenanceRequestSchema>
export type PmInspectionCreateForm = z.infer<typeof pmInspectionCreateSchema>

export const pmChargeGenerateSchema = z.object({
  scope: z.enum(['owner', 'lease']),
  lease_id: z.string().optional().or(z.literal('')),
  start_month: z.string().optional().or(z.literal('')),
  months: z
    .string()
    .min(1, 'Number of months is required')
    .refine(
      (v) => {
        const n = Number(v)
        return !isNaN(n) && n >= 1 && n <= 24
      },
      'Months must be between 1 and 24',
    ),
})

export type PmChargeGenerateForm = z.infer<typeof pmChargeGenerateSchema>

export const pmMaintenanceUpdateSchema = z.object({
  request_status: z.enum(['open', 'in_review', 'work_order_created', 'resolved', 'closed']),
  work_order_status: z.enum(['created', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled']).optional().or(z.literal('')),
  assign_to_me: z.enum(['yes', 'no']),
  priority: z.string().optional().or(z.literal('')),
  estimated_cost: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      'Estimated cost must be a non-negative number',
    ),
  actual_cost: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      'Actual cost must be a non-negative number',
    ),
  scheduled_for: z.string().optional().or(z.literal('')),
  completion_notes: z.string().optional().or(z.literal('')),
  vendor_name: z.string().optional().or(z.literal('')),
  vendor_contact: z.string().optional().or(z.literal('')),
})

export type PmMaintenanceUpdateForm = z.infer<typeof pmMaintenanceUpdateSchema>

export const pmLeaseTerminateSchema = z.object({
  termination_date: z.string().optional().or(z.literal('')),
  reason: z.string().optional().or(z.literal('')),
})

export type PmLeaseTerminateForm = z.infer<typeof pmLeaseTerminateSchema>

export const pmSettingsSchema = z.object({
  payment_due_day: z
    .number({ invalid_type_error: 'Required' })
    .int('Must be a whole number')
    .min(1, 'Due day must be between 1 and 28')
    .max(28, 'Due day must be between 1 and 28'),
  grace_period_days: z
    .number({ invalid_type_error: 'Required' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(30, 'Cannot exceed 30 days'),
  late_fee_enabled: z.boolean(),
  late_fee_flat: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Cannot be negative')
    .nullable()
    .optional(),
  late_fee_percent: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100')
    .nullable()
    .optional(),
  auto_generate_charges: z.boolean(),
  notify_owner_on_payment: z.boolean(),
  notify_tenant_on_charge: z.boolean(),
  default_lease_term_months: z
    .number({ invalid_type_error: 'Required' })
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 month')
    .max(60, 'Cannot exceed 60 months'),
})

export type PmSettingsForm = z.infer<typeof pmSettingsSchema>
