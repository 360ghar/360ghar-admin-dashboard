import { api } from '@/store/api'
import { fetchAllPages } from '@/store/fetchAllPages'
import type { Amenity } from '@/types/api'

export const amenitiesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Every amenity, ordered by title. The route is a CursorPage (default 20 per page),
    // and the property form and filters need the whole catalogue, so follow next_cursor.
    getAmenities: builder.query<Amenity[], void>({
      queryFn: (_arg, _api, _extra, baseQuery) => fetchAllPages<Amenity>(baseQuery, '/amenities'),
      providesTags: [{type: 'Amenity' as const, id: 'LIST'}]
    }),
  }),
})

export const {
  useGetAmenitiesQuery,
} = amenitiesApi
