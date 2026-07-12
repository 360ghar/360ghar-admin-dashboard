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
}).refine(
  (d) => d.floor_number == null || d.total_floors == null || d.total_floors >= d.floor_number,
  { message: 'Total floors must be >= floor number', path: ['total_floors'] },
)

// Property form page validation schema (used in PropertyFormPage.tsx)
export const propertyFormPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  property_type: z.enum([
    'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo',
    'penthouse', 'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
  ]),
  purpose: z.enum(['buy', 'rent', 'short_stay']),
  base_price: z.number().min(1, 'Price must be greater than 0'),
  city: z.string().min(1, 'City is required'),
  locality: z.string().min(1, 'Locality is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  area_sqft: z.number().min(1, 'Area must be greater than 0'),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  balconies: z.number().min(0).optional(),
  parking_spaces: z.number().min(0).optional(),
  floor_number: z.number().min(0).optional(),
  total_floors: z.number().min(0).optional(),
  age_of_property: z.number().min(0).optional(),
  max_occupancy: z.number().min(1).optional(),
  minimum_stay_days: z.number().min(1).optional(),
  amenity_ids: z.array(z.number()),
  features: z.array(z.string()),
  owner_name: z.string().min(1, 'Owner name is required'),
  owner_contact: z.string().min(1, 'Owner contact is required'),
}).refine(
  (d) => d.floor_number == null || d.total_floors == null || d.total_floors >= d.floor_number,
  { message: 'Total floors must be >= floor number', path: ['total_floors'] },
)

// Advanced property search validation schema (used in AdvancedPropertySearch.tsx)
export const propertySearchSchema = z.object({
  q: z.string().optional(),
  property_type: z.array(z.string()).optional(),
  purpose: z.string().optional(),
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
  amenities: z.array(z.number()).optional(),
  features: z.array(z.string()).optional(),
  parking_spaces_min: z.number().optional(),
  floor_number_min: z.number().optional(),
  floor_number_max: z.number().optional(),
  age_max: z.number().optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.number().optional(),
  sort_by: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
})

// Export inferred types
export type PropertyFormValues = z.infer<typeof propertyFormSchema>
export type PropertyFormPageValues = z.infer<typeof propertyFormPageSchema>
export type PropertySearchFormValues = z.infer<typeof propertySearchSchema>
