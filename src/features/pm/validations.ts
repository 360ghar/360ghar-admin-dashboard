import { z } from 'zod'
import { isValidJson } from '@/lib/json'
import { VALIDATION, PAYMENT_METHOD_VALUES } from './constants'
import { validatePropertyValues, type PropertyFormMode, type PropertyFormValues } from './propertyForm'

/**
 * Create and edit form of a managed property. Every value is a string. The rules live in
 * `propertyForm.ts` next to the field catalogue, so the schema cannot drift from the fields.
 */
export const pmPropertyFormSchema = (mode: PropertyFormMode, initial?: PropertyFormValues) =>
  z.record(z.string(), z.string()).superRefine((values, ctx) => {
    for (const [field, message] of Object.entries(validatePropertyValues(values, mode, initial))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
    }
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
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Security deposit must be zero or more'),
    // Blank due day and grace period take the managed property's settings (the backend copies them).
    payment_due_day: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= VALIDATION.PAYMENT_DUE_DAY_MIN && Number(v) <= VALIDATION.PAYMENT_DUE_DAY_MAX),
        `Payment due day must be between ${VALIDATION.PAYMENT_DUE_DAY_MIN} and ${VALIDATION.PAYMENT_DUE_DAY_MAX}`,
      ),
    grace_period_days: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), 'Grace period must be a whole number of 0 or more'),
    // Late fee: a fixed amount wins over a percentage of the rent.
    late_fee_amount: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), 'Late fee amount must be zero or more'),
    late_fee_percentage: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), 'Late fee percentage must be between 0 and 100'),
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
  payment_method: z.enum(PAYMENT_METHOD_VALUES),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export const pmExpenseCreateSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  title: z.string().max(200, 'Title must be 200 characters or fewer').optional().or(z.literal('')),
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
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number')
    .refine((v) => Number(v) <= 9999999999.99, 'Amount must be 9999999999.99 or less'),
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export const pmExpenseUpdateSchema = z.object({
  title: z.string().max(200, 'Title must be 200 characters or fewer').optional().or(z.literal('')),
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
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be a positive number')
    .refine((v) => Number(v) <= 9999999999.99, 'Amount must be 9999999999.99 or less'),
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

export type PmLeaseCreateForm = z.infer<typeof pmLeaseCreateSchema>
export type PmRentPaymentForm = z.infer<typeof pmRentPaymentSchema>
export type PmExpenseCreateForm = z.infer<typeof pmExpenseCreateSchema>
export type PmExpenseUpdateForm = z.infer<typeof pmExpenseUpdateSchema>
export type PmMaintenanceRequestForm = z.infer<typeof pmMaintenanceRequestSchema>
export type PmInspectionCreateForm = z.infer<typeof pmInspectionCreateSchema>

export const pmChargeGenerateSchema = z.object({
  scope: z.enum(['owner', 'lease']),
  lease_id: z.string().optional().or(z.literal('')),
  // An HTML month input gives YYYY-MM. The backend wants the first day of the month (YYYY-MM-01).
  start_month: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^\d{4}-(0[1-9]|1[0-2])$/.test(v), 'Choose a month'),
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
  urgency: z.enum(['emergency', 'high', 'medium', 'low']),
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
