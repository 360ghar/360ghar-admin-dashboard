import { api } from '@/store/api'
import type {
  Visit,
  VisitCreate,
  VisitUpdate,
  PaginatedResponse
} from '@/types/api'

export interface VisitsQuery {
  cursor?: string | null
  limit?: number
  status?: string
  agent_id?: number
  property_id?: number
  user_id?: number
  q?: string
  include_total?: boolean
}

/**
 * Cursor-based query args for the "current user's" visits endpoints.
 * The three list endpoints (`/visits`, `/visits/upcoming`, `/visits/past`)
 * all accept the same `{ cursor, limit }` shape.
 */
export interface VisitsCursorQuery {
  cursor?: string | null
  limit?: number
  include_total?: boolean
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
      invalidatesTags: [{type: 'Visit', id: 'LIST'}, {type: 'Property', id: 'LIST'}]
    }),

    // Get current user's visits
    getUserVisits: builder.query<PaginatedResponse<Visit>, VisitsCursorQuery>({
      query: ({ cursor, limit, include_total }) => ({
        url: '/visits',
        params: { limit: limit ?? DEFAULT_VISITS_LIMIT, cursor: cursor ?? undefined, ...(include_total ? { include_total: true } : {}) }
      }),
      providesTags: [{type: 'Visit' as const, id: 'LIST'}]
    }),

    // Get visit details
    getVisit: builder.query<Visit, number>({
      query: (id) => `/visits/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Visit' as const, id: arg}]
    }),

    // Update visit details
    updateVisit: builder.mutation<Visit, { id: number; data: VisitUpdate }>({
      query: ({ id, data }) => ({
        url: `/visits/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { id }) => [{ type: 'Visit', id }, { type: 'Visit', id: 'LIST' }]
    }),

    // Reschedule a visit
    rescheduleVisit: builder.mutation<Visit, { visitId: number; newDate: string; reason: string }>({
      query: ({ visitId, newDate, reason }) => ({
        url: `/visits/${visitId}/reschedule`,
        method: 'POST',
        body: {
          new_date: newDate,
          reason,
        }
      }),
      invalidatesTags: (res, _e, { visitId }) => [{ type: 'Visit', id: visitId }, { type: 'Visit', id: 'LIST' }]
    }),

    // Cancel a visit
    cancelVisit: builder.mutation<Visit, { visitId: number; reason: string }>({
      query: ({ visitId, ...data }) => ({
        url: `/visits/${visitId}/cancel`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (res, _e, { visitId }) => [{ type: 'Visit', id: visitId }, { type: 'Visit', id: 'LIST' }]
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
      extraOptions: { refetchOnFocus: true },
    }),

    // Complete visit (admin/agent)
    completeVisit: builder.mutation<Visit, { visitId: number; notes?: string; feedback?: string }>({
      query: ({ visitId, ...data }) => ({
        url: `/visits/${visitId}/complete`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (res, _e, { visitId }) => [{ type: 'Visit', id: visitId }, { type: 'Visit', id: 'LIST' }]
    }),

  }),
})

export const {
  useScheduleVisitMutation,
  useGetUserVisitsQuery,
  useGetVisitQuery,
  useUpdateVisitMutation,
  useRescheduleVisitMutation,
  useCancelVisitMutation,
  useGetAllVisitsQuery,
  useCompleteVisitMutation,
} = visitsApi