import { pmDocumentsApi } from './documents'
import type { PaginatedResponse } from '@/types/api'
import type { InspectionChecklist, InspectionChecklistCreate, InspectionSign, PmInspectionsQuery } from '@/types/pm'
import { withPageLimit } from './pmParams'

export const pmInspectionsApi = pmDocumentsApi.injectEndpoints({
  endpoints: (builder) => ({
    createPmInspection: builder.mutation<InspectionChecklist, InspectionChecklistCreate>({
      query: (payload) => ({
        url: '/pm/inspections',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmInspection', id: 'LIST' }],
    }),

    listPmInspections: builder.query<PaginatedResponse<InspectionChecklist>, PmInspectionsQuery>({
      query: (args) => ({ url: '/pm/inspections', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((i) => ({ type: 'PmInspection' as const, id: i.id })), { type: 'PmInspection' as const, id: 'LIST' }]
          : [{ type: 'PmInspection' as const, id: 'LIST' }],
    }),

    getPmInspection: builder.query<InspectionChecklist, number>({
      query: (inspection_id) => `/pm/inspections/${inspection_id}`,
      providesTags: (_res, _e, inspection_id) => [{ type: 'PmInspection', id: inspection_id }],
    }),

    signPmInspection: builder.mutation<InspectionChecklist, { inspection_id: number; payload: InspectionSign }>({
      query: ({ inspection_id, payload }) => ({
        url: `/pm/inspections/${inspection_id}/sign`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { inspection_id }) => [{ type: 'PmInspection', id: inspection_id }, { type: 'PmInspection', id: 'LIST' }],
    }),
  }),
})
