import { api } from '@/store/api'
import type { PaginatedResponse, Property, PropertyCreate, PropertyDetail, PropertyQuery, PropertyUpdate } from '@/types/api'
import { isRecord } from '@/lib/storage'

// PropertyCreate and PropertyUpdate are imported from @/types/api
export type { Property, PropertyCreate, PropertyDetail, PropertyUpdate }

/**
 * Query keys of `GET /properties`, taken from the spec: an undeclared key is a 422.
 * `semantic_search` is left out on purpose, no admin screen uses it.
 * Bounds: lat -90..90, lng -180..180, radius an integer, bedrooms and bathrooms 0..50 whole numbers,
 * floor_number -5..200, age_max 0..500, windows_min 0..100, parking_spaces_min 0..100.
 * `radius` only means something together with `lat` and `lng`.
 */
export type PropertySearchParams = Omit<PropertyQuery, 'semantic_search'>

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

function isPropertyPage(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.items) ||
      typeof value.has_more !== 'boolean' ||
      (value.next_cursor !== null && typeof value.next_cursor !== 'string')) return false
  return value.items.every((item: unknown) => isRecord(item) &&
    typeof item.id === 'number' && Number.isFinite(item.id) && typeof item.title === 'string')
}

export const propertiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Search properties with comprehensive filtering
    searchProperties: builder.query<PaginatedResponse<Property>, PropertySearchParams>({
      query: (params) => ({
        url: '/properties',
        params: toSearchParams(params),
        validateStatus: (response, body: unknown) => response.ok && isPropertyPage(body),
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'Property' as const, id: p.id })),
              { type: 'Property' as const, id: 'LIST' },
            ]
          : [{ type: 'Property' as const, id: 'LIST' }],
    }),

    // The detail route returns `PropertyDetail`: it adds `agent` and the viewer-scoped visit fields.
    getProperty: builder.query<PropertyDetail, number>({
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
      invalidatesTags: [
        { type: 'Property', id: 'LIST' },
        { type: 'Property', id: 'RECOMMENDATIONS' },
      ],
    }),

    updateProperty: builder.mutation<Property, { id: number; data: PropertyUpdate }>({
      query: ({ id, data }) => ({
        url: `/properties/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (_res, _e, { id }) => [
        { type: 'Property', id },
        { type: 'Property', id: 'LIST' },
        { type: 'Property', id: 'RECOMMENDATIONS' },
      ],
    }),

    deleteProperty: builder.mutation<void, number>({
      query: (id) => ({
        url: `/properties/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_res, _e, id) => [
        { type: 'Property', id },
        { type: 'Property', id: 'LIST' },
        { type: 'Property', id: 'RECOMMENDATIONS' },
      ],
    }),

    // Get property recommendations (uniform cursor-paginated shape)
    getRecommendations: builder.query<PaginatedResponse<Property>, { limit?: number; cursor?: string | null }>({
      query: (params) => ({
        url: '/properties/recommendations',
        params: { limit: 10, ...params }
      }),
      providesTags: [{ type: 'Property', id: 'RECOMMENDATIONS' }],
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
} = propertiesApi
