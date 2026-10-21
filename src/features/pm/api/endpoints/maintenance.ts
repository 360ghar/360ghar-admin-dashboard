import { pmExpensesApi } from './expenses'
import type { PaginatedResponse } from '@/types/api'
import type { MaintenanceRequest, MaintenanceRequestCreate, MaintenanceRequestsQuery, MaintenanceRequestUpdate } from '@/types/pm'
import type { RootState } from '@/store'
import { patchCachedEntries } from './pmCache'
import { withPageLimit } from './pmParams'

export const pmMaintenanceApi = pmExpensesApi.injectEndpoints({
  endpoints: (builder) => ({
    createMaintenanceRequest: builder.mutation<MaintenanceRequest, MaintenanceRequestCreate>({
      query: (payload) => ({
        url: '/pm/maintenance/requests',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmMaintenanceRequest', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    listMaintenanceRequests: builder.query<PaginatedResponse<MaintenanceRequest>, MaintenanceRequestsQuery>({
      query: (args) => ({ url: '/pm/maintenance/requests', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((r) => ({ type: 'PmMaintenanceRequest' as const, id: r.id })),
              { type: 'PmMaintenanceRequest' as const, id: 'LIST' },
            ]
          : [{ type: 'PmMaintenanceRequest' as const, id: 'LIST' }],
    }),

    // PATCH. The backend has no DELETE: close a request with `request_status: 'closed'`.
    updateMaintenanceRequest: builder.mutation<
      MaintenanceRequest,
      { request_id: number; payload: MaintenanceRequestUpdate }
    >({
      query: ({ request_id, payload }) => ({
        url: `/pm/maintenance/requests/${request_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { request_id }) => [{ type: 'PmMaintenanceRequest', id: request_id }, { type: 'PmMaintenanceRequest', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
      onQueryStarted: async ({ request_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        const patches = patchCachedEntries(
          pmMaintenanceApi.util.selectInvalidatedBy(lifecycle.getState() as RootState, [{ type: 'PmMaintenanceRequest', id: 'LIST' }]),
          'listMaintenanceRequests',
          (args) => dispatch(pmMaintenanceApi.util.updateQueryData('listMaintenanceRequests', args as never, (draft) => {
            const item = draft.items.find((r) => r.id === request_id)
            if (item) {
              if (payload.request_status !== undefined && payload.request_status !== null) item.request_status = payload.request_status
              if (payload.work_order_status !== undefined && payload.work_order_status !== null) item.work_order_status = payload.work_order_status
              if (payload.urgency !== undefined && payload.urgency !== null) item.urgency = payload.urgency
              if (payload.assigned_agent_id !== undefined && payload.assigned_agent_id !== null) item.assigned_agent_id = payload.assigned_agent_id
              if (payload.estimated_cost !== undefined && payload.estimated_cost !== null) item.estimated_cost = payload.estimated_cost
              if (payload.actual_cost !== undefined && payload.actual_cost !== null) item.actual_cost = payload.actual_cost
              if (payload.scheduled_for !== undefined && payload.scheduled_for !== null) item.scheduled_for = payload.scheduled_for
              if (payload.completion_notes !== undefined && payload.completion_notes !== null) item.completion_notes = payload.completion_notes
              if (payload.vendor_name !== undefined && payload.vendor_name !== null) item.vendor_name = payload.vendor_name
              if (payload.vendor_contact !== undefined && payload.vendor_contact !== null) item.vendor_contact = payload.vendor_contact
            }
          })) as { undo: () => void },
        )
        try {
          await queryFulfilled
        } catch {
          patches.forEach((p) => p.undo())
        }
      },
    }),
  }),
})
