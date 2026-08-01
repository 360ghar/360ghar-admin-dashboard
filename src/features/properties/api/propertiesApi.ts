import { api } from '@/store/api'
import type { PaginatedResponse, Property, PropertyCreate, PropertyUpdate } from '@/types/api'

// PropertyCreate and PropertyUpdate are imported from @/types/api
export type { Property, PropertyCreate, PropertyUpdate }

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
    searchProperties: builder.query<PaginatedResponse<Property>, PropertySearchParams>({
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

    getProperty: builder.query<Property, number>({
      query: (id) => `/properties/${id}`,
      providesTags: (res, _e, id) => [{ type: 'Property', id }],
    }),

    createProperty: builder.mutation<Property, { data: PropertyCreate; ownerId?: number }>({
      query: ({ data, ownerId }) => ({
        url: '/properties',
        method: 'POST',
        params: ownerId ? { owner_id: ownerId } : undefined,
        body: data
      }),
      invalidatesTags: [{ type: 'Property', id: 'LIST' }],
    }),

    updateProperty: builder.mutation<Property, { id: number; data: PropertyUpdate }>({
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
    getRecommendations: builder.query<PaginatedResponse<Property>, { limit?: number; cursor?: string | null }>({
      query: (params) => ({
        url: '/properties/recommendations',
        params: { limit: 10, ...params }
      }),
      providesTags: [{ type: 'Property', id: 'RECOMMENDATIONS' }],
    }),

    semanticSearchProperties: builder.query<PaginatedResponse<Property>, PropertySearchParams>({
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
