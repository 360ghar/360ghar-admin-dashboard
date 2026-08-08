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

// Export inferred types
export type PropertyFormValues = z.infer<typeof propertyFormSchema>
