import { z } from 'zod'

const numPreprocess = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v))

// Property form validation schema (used in PropertyForm.tsx)
export const propertyFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  property_type: z.enum([
    'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo',
    'penthouse', 'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
  ], { required_error: 'Property type is required' }),
  purpose: z.enum(['buy', 'rent', 'short_stay'], { required_error: 'Purpose is required' }),
  status: z.string().optional(),
  base_price: z.preprocess(numPreprocess, z.number({ required_error: 'Price is required', invalid_type_error: 'Price is required' }).min(1, 'Price must be greater than 0')),
  city: z.string().min(1, 'City is required'),
  locality: z.string().min(1, 'Locality is required'),
  address: z.string().optional(),
  latitude: z.preprocess(numPreprocess, z.number().optional()),
  longitude: z.preprocess(numPreprocess, z.number().optional()),
  owner_id: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
  is_available: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional()),
  available_from: z.string().optional(),
  amenity_ids: z.array(z.number()).optional(),
  pincode: z.string().optional(),
  area_sqft: z.preprocess(numPreprocess, z.number({ required_error: 'Area is required', invalid_type_error: 'Area is required' }).min(1, 'Area must be greater than 0')),
  bedrooms: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  bathrooms: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  balconies: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  parking_spaces: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  floor_number: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  total_floors: z.preprocess(numPreprocess, z.number().min(1).default(1)),
  age_of_property: z.preprocess(numPreprocess, z.number().min(0).default(0)),
  max_occupancy: z.preprocess(numPreprocess, z.number().min(1).default(1)),
  minimum_stay_days: z.preprocess(numPreprocess, z.number().min(1).default(1)),
  features: z.array(z.string()).optional(),
  owner_name: z.string().optional(),
  owner_contact: z.string().optional(),
  // Pricing & listing details
  monthly_rent: z.preprocess(numPreprocess, z.number().min(0).optional()),
  daily_rate: z.preprocess(numPreprocess, z.number().min(0).optional()),
  kitchen_type: z.enum(['vegetarian', 'non_vegetarian', 'eggetarian', 'any']).optional(),
  ventilation_type: z.enum(['good', 'average', 'poor']).optional(),
  furnishing_level: z.enum(['furnished', 'semi_furnished', 'unfurnished']).optional(),
  windows_count: z.preprocess(numPreprocess, z.number().min(0).max(100).optional()),
  ventilation_shafts: z.preprocess(numPreprocess, z.number().min(0).max(50).optional()),
  setup_cost: z.preprocess(numPreprocess, z.number().min(0).optional()),
  other_charges: z.preprocess(numPreprocess, z.number().min(0).optional()),
  other_charges_description: z.string().max(300, 'Must be 300 characters or fewer').optional(),
}).refine(
  (d) => d.floor_number == null || d.total_floors == null || d.total_floors >= d.floor_number,
  { message: 'Total floors must be >= floor number', path: ['total_floors'] },
)

// Export inferred types
export type PropertyFormValues = z.infer<typeof propertyFormSchema>

/**
 * Parity schema for the alternate (currently unrouted) page-style form stack.
 * Kept as an alias of the live schema so the two can never drift apart.
 */
export const propertyFormPageSchema = propertyFormSchema
export type PropertyFormPageValues = z.infer<typeof propertyFormPageSchema>

// Property search params schema (used by the search/filter layer)
export const propertySearchSchema = z.object({
  q: z.string().optional(),
  property_type: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  status: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  bedrooms_min: z.number().optional(),
  bedrooms_max: z.number().optional(),
  bathrooms_min: z.number().optional(),
  bathrooms_max: z.number().optional(),
  area_min: z.number().optional(),
  area_max: z.number().optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  pincode: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  radius: z.number().optional(),
  sort_by: z.string().optional(),
  cursor: z.string().nullable().optional(),
  limit: z.number().optional(),
  // Listing details filters
  furnishing: z.array(z.string()).optional(),
  kitchen_type: z.array(z.string()).optional(),
  ventilation_type: z.array(z.string()).optional(),
  windows_min: z.number().optional(),
  has_lift: z.boolean().optional(),
})

export type PropertySearchValues = z.infer<typeof propertySearchSchema>
