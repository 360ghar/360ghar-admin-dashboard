import { api } from '@/store/api'
import type { PropertyCreate, PropertyUpdate } from '@/types/api'

// Updated Property interface to match API documentation
export interface PropertyResponse {
  id: number
  title: string
  description?: string
  property_type: 'house' | 'apartment' | 'builder_floor' | 'room' | 'villa' | 'plot' | 'condo' | 'penthouse' | 'studio' | 'loft' | 'pg' | 'flatmate' | 'office' | 'shop' | 'warehouse'
  purpose: 'buy' | 'rent' | 'short_stay'
  base_price: number
  latitude?: number
  longitude?: number
  city?: string
  locality?: string
  pincode?: string
  area_sqft?: number
  bedrooms?: number
  bathrooms?: number
  balconies?: number
  parking_spaces?: number
  floor_number?: number
  total_floors?: number
  age_of_property?: number
  max_occupancy?: number
  minimum_stay_days?: number
  amenities: Array<{
    id: number
    title: string
    icon?: string
    category?: string
  }>
  features: string[]
  images: Array<{
    id: number
    property_id: number
    image_url: string
    caption?: string
    image_category: string
    display_order?: number
    is_main_image: boolean
  }>
  main_image_url: string
  owner_id: number
  owner_name: string
  owner_contact: string
  status: string
  liked: boolean
  user_has_scheduled_visit: boolean
  user_scheduled_visit_count: number
  user_next_visit_date?: string
  distance_km?: number
  created_at: string
  updated_at?: string
}

export interface PaginatedPropertyResponse {
  items: PropertyResponse[]
  next_cursor: string | null
  has_more: boolean
  limit: number
  total?: number
}

export interface PropertySearchParams {
  // Location
  lat?: number
  lng?: number
  radius?: number
  // Search
  q?: string
  // Property filters
  property_type?: string[]
  purpose?: string
  status?: string
  price_min?: number
  price_max?: number
  bedrooms_min?: number
  bedrooms_max?: number
  bathrooms_min?: number
  bathrooms_max?: number
  area_min?: number
  area_max?: number
  // Location filters
  city?: string
  locality?: string
  pincode?: string
  // Amenities
  amenities?: string[]
  features?: string[]
  // Additional
  parking_spaces_min?: number
  floor_number_min?: number
  floor_number_max?: number
  age_max?: number
  // Short stay
  check_in?: string
  check_out?: string
  guests?: number
  // Sorting
  sort_by?: string
  // Pagination (cursor-based)
  cursor?: string | null
  limit?: number
  // Auth-aware
  exclude_swiped?: boolean
  // Semantic search
  semantic_search?: boolean
  // Total count
  include_total?: boolean
}

// PropertyCreate and PropertyUpdate are imported from @/types/api
export type { PropertyCreate, PropertyUpdate }

const toSearchParams = (params: PropertySearchParams): URLSearchParams => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)))
      continue
    }
    search.set(key, String(value))
  }

  return search
}

export const propertiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Search properties with comprehensive filtering
    searchProperties: builder.query<PaginatedPropertyResponse, PropertySearchParams>({
      query: (params) => ({
        url: '/properties',
        params: toSearchParams(params)
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'Property' as const, id: p.id })),
              { type: 'Property' as const, id: 'LIST' },
            ]
          : [{ type: 'Property' as const, id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    getProperty: builder.query<PropertyResponse, number>({
      query: (id) => `/properties/${id}`,
      providesTags: (res, _e, id) => [{ type: 'Property', id }],
    }),

    createProperty: builder.mutation<PropertyResponse, { data: PropertyCreate; ownerId?: number }>({
      query: ({ data, ownerId }) => ({
        url: '/properties',
        method: 'POST',
        params: ownerId ? { owner_id: ownerId } : undefined,
        body: data
      }),
      invalidatesTags: [{ type: 'Property', id: 'LIST' }],
    }),

    updateProperty: builder.mutation<PropertyResponse, { id: number; data: PropertyUpdate }>({
      query: ({ id, data }) => ({
        url: `/properties/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'Property', id }, { type: 'Property', id: 'LIST' }],
    }),

    deleteProperty: builder.mutation<void, number>({
      query: (id) => ({
        url: `/properties/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_res, _e, id) => [{ type: 'Property', id }, { type: 'Property', id: 'LIST' }],
    }),

    // Get property recommendations (uniform cursor-paginated shape)
    getRecommendations: builder.query<PaginatedPropertyResponse, { limit?: number; cursor?: string | null }>({
      query: (params) => ({
        url: '/properties/recommendations',
        params: { limit: 10, ...params }
      }),
      providesTags: [{ type: 'Property', id: 'RECOMMENDATIONS' }],
    }),

    semanticSearchProperties: builder.query<PaginatedPropertyResponse, PropertySearchParams>({
      query: (params) => ({
        url: '/properties/semantic-search',
        params: toSearchParams(params)
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'Property' as const, id: p.id })),
              { type: 'Property' as const, id: 'LIST' },
            ]
          : [{ type: 'Property' as const, id: 'LIST' }],
    }),
  }),
})

export const {
  useSearchPropertiesQuery,
  useGetPropertyQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useDeletePropertyMutation,
  useGetRecommendationsQuery,
  useSemanticSearchPropertiesQuery,
} = propertiesApi
