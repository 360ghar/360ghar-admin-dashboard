import { z } from 'zod'

// Visit form validation schema (used in VisitForm.tsx)
export const visitFormSchema = z.object({
  // The visitor. `POST /visits` honours `user_id` for admins and agents (other callers always own the visit).
  user_id: z.coerce.number({ invalid_type_error: 'Select a user' }).int().min(1, 'Select a user'),
  property_id: z.coerce.number().min(1, 'Property is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
}).refine(
  (d) => !d.scheduled_date || new Date(d.scheduled_date) > new Date(),
  { message: 'Scheduled date must be in the future', path: ['scheduled_date'] },
)

// Schedule visit form validation schema (used in VisitManagementPage.tsx)
export const scheduleVisitSchema = z.object({
  property_id: z.number().min(1, 'Property is required'),
  scheduled_date: z.string().min(1, 'Date and time are required'),
  special_requirements: z.string().optional(),
}).refine(
  (d) => !d.scheduled_date || new Date(d.scheduled_date) > new Date(),
  { message: 'Scheduled date must be in the future', path: ['scheduled_date'] },
)

// Complete visit form validation schema (used in VisitManagementPage.tsx)
export const completeVisitSchema = z.object({
  notes: z.string().min(1, 'Notes are required'),
  feedback: z.string().optional(),
})

// Export inferred types
export type VisitFormValues = z.infer<typeof visitFormSchema>
export type ScheduleVisitFormValues = z.infer<typeof scheduleVisitSchema>
export type CompleteVisitFormValues = z.infer<typeof completeVisitSchema>
