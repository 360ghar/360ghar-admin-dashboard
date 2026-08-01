import { z } from 'zod'
import { isValidJson } from '@/lib/json'

// Bug report form validation schema
export const bugReportSchema = z.object({
  source: z.enum(['web', 'mobile', 'api']),
  bug_type: z.enum(['ui_bug', 'functionality_bug', 'performance_issue', 'crash', 'feature_request', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  steps_to_reproduce: z.string().optional(),
  expected_behavior: z.string().optional(),
  actual_behavior: z.string().optional(),
  device_info: z.object({
    os: z.string().optional(),
    version: z.string().optional(),
    model: z.string().optional(),
    browser: z.string().optional(),
    screen_resolution: z.string().optional(),
  }).optional(),
  app_version: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// Profile form validation schema (used in ProfilePage.tsx)
export const profileSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

// FAQ form validation (used in FaqsManagementPage.tsx)
export const faqSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Keep the question under 500 characters'),
  answer: z.string().trim().min(1, 'Answer is required'),
  category: z.string().trim().max(100).optional(),
  tags: z.string().trim().optional(),
  display_order: z.coerce.number().int('Must be a whole number').min(0, 'Must be 0 or greater'),
  is_active: z.boolean(),
})

// App update form validation (used in AppUpdateFormDialog.tsx)
export const appUpdateSchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  version: z.string().min(1, 'Version is required').regex(/^\d+\.\d+\.\d+$/, 'Must be a valid semver (e.g. 1.0.0)'),
  build_number: z.string().min(1, 'Build number is required').regex(/^\d+$/, 'Must be a number'),
  release_notes: z.string().optional(),
  download_url: z.string().min(1, 'Download URL is required').url('Must be a valid URL'),
  is_mandatory: z.boolean(),
  is_active: z.boolean(),
  min_supported_version: z.string().optional(),
})

// CMS page form validation (used in PageFormDialog.tsx)
export const cmsPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  unique_name: z.string().min(1, 'Unique name is required').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  format: z.enum(['html', 'markdown'], { required_error: 'Format is required' }),
  custom_config_text: z.string().optional(),
  is_active: z.boolean(),
  is_draft: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.custom_config_text && !isValidJson(data.custom_config_text)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON', path: ['custom_config_text'] })
  }
})

// Export inferred types
export type BugReportFormData = z.infer<typeof bugReportSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type FaqFormValues = z.infer<typeof faqSchema>
export type AppUpdateFormValues = z.infer<typeof appUpdateSchema>
export type CmsPageFormValues = z.infer<typeof cmsPageSchema>
