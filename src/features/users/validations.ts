import { z } from 'zod'

// User detail form validation schema (used in UserDetail.tsx).
// `PUT /users/{id}` is `AdminUserUpdate`: no email (changes go through Supabase), no bio.
export const userDetailSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
})

// User profile form validation schema (used in UserProfilePage.tsx).
// `PUT /users/profile` is `UserUpdate`: no email, bio, preferences or profile_image_url.
export const userProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
})

/** Counts the backend stores as integers (a decimal is a 422). */
const nonNegInt = z.preprocess(
  (v) => (typeof v === 'number' && Number.isNaN(v) ? 0 : v),
  z.number({ invalid_type_error: 'Must be a number' }).int('Must be a whole number').min(0, 'Must be 0 or greater'),
)

// Coerce empty/NaN number inputs (common with valueAsNumber on cleared fields) to 0
const nonNegNumber = z.preprocess(
  (v) => (typeof v === 'number' && Number.isNaN(v) ? 0 : v),
  z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be 0 or greater'),
)

// User preferences form validation schema (used in UserProfilePage.tsx)
export const userPreferencesSchema = z.object({
  property_type: z.array(z.string()).min(1, 'Select at least one property type'),
  // Optional: an unset purpose stays unset instead of falling back to a real value.
  purpose: z.enum(['buy', 'rent', 'short_stay']).optional(),
  budget_min: nonNegNumber,
  budget_max: nonNegNumber,
  bedrooms_min: nonNegInt,
  bedrooms_max: nonNegInt,
  area_min: nonNegNumber,
  area_max: nonNegNumber,
  location_preference: z.array(z.string()),
  max_distance_km: nonNegInt,
}).refine(data => data.budget_min <= data.budget_max, {
  message: 'Minimum budget must be less than or equal to maximum budget',
  path: ['budget_max'],
}).refine(data => data.bedrooms_min <= data.bedrooms_max, {
  message: 'Minimum bedrooms must be less than or equal to maximum bedrooms',
  path: ['bedrooms_max'],
}).refine(data => data.area_min <= data.area_max, {
  message: 'Minimum area must be less than or equal to maximum area',
  path: ['area_max'],
})

// Export inferred types
export type UserDetailFormValues = z.infer<typeof userDetailSchema>
export type UserProfileFormValues = z.infer<typeof userProfileSchema>
export type UserPreferencesFormValues = z.infer<typeof userPreferencesSchema>
