import { api } from '@/store/api'
import type {
  Visit,
  VisitComplete,
  VisitCreate,
  VisitStatus,
  VisitsQuery as AllVisitsQuery,
  PaginatedResponse
} from '@/types/api'

/** Query of `GET /visits/all` (admin and agent). `q` searches property title, visitor name and agent name. */
export type VisitsQuery = AllVisitsQuery

/**
 * Cursor-based query args for the "current user's" visits endpoints.
 * `/visits` takes `{ cursor, limit, include_total, status }`; `/visits/upcoming`
 * and `/visits/past` take no filter. There is no `context`, `upcoming` or `past` key.
 */
export interface VisitsCursorQuery {
  cursor?: string | null
  limit?: number
  include_total?: boolean
  status?: VisitStatus
}

const DEFAULT_VISITS_LIMIT = 20

export const visitsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Schedule a visit
    scheduleVisit: builder.mutation<Visit, VisitCreate>({
      query: (data) => ({
        url: '/visits',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (_res, _error, { property_id }) => [
        { type: 'Visit', id: 'LIST' },
        { type: 'Property', id: property_id },
        { type: 'Property', id: 'LIST' },
      ]
    }),

    // Get current user's visits
    getUserVisits: builder.query<PaginatedResponse<Visit>, VisitsCursorQuery>({
      query: ({ cursor, limit, include_total, status }) => ({
        url: '/visits',
        params: {
          limit: limit ?? DEFAULT_VISITS_LIMIT,
          cursor: cursor ?? undefined,
          status: status ?? undefined,
          ...(include_total ? { include_total: true } : {})
        }
      }),
      providesTags: [{type: 'Visit' as const, id: 'LIST'}]
    }),

    // Get visit details
    getVisit: builder.query<Visit, number>({
      query: (id) => `/visits/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Visit' as const, id: arg}]
    }),

    // Reschedule a visit
    rescheduleVisit: builder.mutation<Visit, { visitId: number; newDate: string; reason?: string }>({
      query: ({ visitId, newDate, reason }) => ({
        url: `/visits/${visitId}/reschedule`,
        method: 'POST',
        // `new_date` must carry a UTC offset (ISO 8601); a naive time is a 422.
        body: {
          new_date: newDate,
          reason: reason || undefined,
        }
      }),
      invalidatesTags: (res, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        { type: 'Visit', id: 'LIST' },
        ...(res ? [{ type: 'Property' as const, id: res.property_id }] : []),
        { type: 'Property', id: 'LIST' },
      ]
    }),

    // Cancel a visit. `reason` is required: 1 to 1000 characters after trimming.
    cancelVisit: builder.mutation<Visit, { visitId: number; reason: string }>({
      query: ({ visitId, ...data }) => ({
        url: `/visits/${visitId}/cancel`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (res, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        { type: 'Visit', id: 'LIST' },
        ...(res ? [{ type: 'Property' as const, id: res.property_id }] : []),
        { type: 'Property', id: 'LIST' },
      ]
    }),

    // Get all visits (admin/agent view)
    getAllVisits: builder.query<PaginatedResponse<Visit>, VisitsQuery>({
      query: (params) => ({
        url: '/visits/all',
        params: { limit: 20, ...params }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((v) => ({ type: 'Visit' as const, id: v.id })),
              { type: 'Visit' as const, id: 'LIST' },
            ]
          : [{ type: 'Visit' as const, id: 'LIST' }],
    }),

    // Complete visit (admin/agent)
    completeVisit: builder.mutation<Visit, { visitId: number } & VisitComplete>({
      query: ({ visitId, ...data }) => ({
        url: `/visits/${visitId}/complete`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (res, _e, { visitId }) => [
        { type: 'Visit', id: visitId },
        { type: 'Visit', id: 'LIST' },
        ...(res ? [{ type: 'Property' as const, id: res.property_id }] : []),
        { type: 'Property', id: 'LIST' },
      ]
    }),

  }),
})

export const {
  useScheduleVisitMutation,
  useGetUserVisitsQuery,
  useGetVisitQuery,
  useRescheduleVisitMutation,
  useCancelVisitMutation,
  useGetAllVisitsQuery,
  useCompleteVisitMutation,
} = visitsApi
