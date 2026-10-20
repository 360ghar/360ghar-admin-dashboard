import { pmPropertiesApi } from './properties'
import { fetchAllPages } from '@/store/fetchAllPages'
import type { PaginatedResponse } from '@/types/api'
import type { Lease, LeaseCreate, LeaseRenew, LeaseTerminate, LeaseUploadSigned, PmLeasesQuery } from '@/types/pm'
import { withPageLimit } from './pmParams'

export const pmLeasesApi = pmPropertiesApi.injectEndpoints({
  endpoints: (builder) => ({
    listPmLeases: builder.query<PaginatedResponse<Lease>, PmLeasesQuery>({
      query: (args) => ({ url: '/pm/leases', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((l) => ({ type: 'PmLease' as const, id: l.id })), { type: 'PmLease' as const, id: 'LIST' }]
          : [{ type: 'PmLease' as const, id: 'LIST' }],
    }),

    // Every lease of an owner, for pickers: follows next_cursor (the backend maximum is 100 per page).
    listAllPmLeases: builder.query<Lease[], { owner_id?: number | null }>({
      queryFn: ({ owner_id }, _api, _extra, baseQuery) =>
        fetchAllPages<Lease>(baseQuery, '/pm/leases', { owner_id }),
      providesTags: [{ type: 'PmLease' as const, id: 'LIST' }],
    }),

    getPmLease: builder.query<Lease, number>({
      query: (lease_id) => `/pm/leases/${lease_id}`,
      providesTags: (_res, _e, lease_id) => [{ type: 'PmLease', id: lease_id }],
    }),

    createPmLease: builder.mutation<Lease, LeaseCreate>({
      query: (payload) => ({
        url: '/pm/leases',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (res) => [
        { type: 'PmLease', id: 'LIST' },
        { type: 'PmProperty', id: 'LIST' },
        ...(res ? [{ type: 'PmProperty' as const, id: res.property_id }] : []),
        { type: 'PmTenant', id: 'LIST' },
        { type: 'PmDashboard', id: 'LIST' },
        { type: 'PmDashboard', id: 'REPORTS' },
      ],
    }),

    uploadSignedPmLease: builder.mutation<Lease, { lease_id: number; payload: LeaseUploadSigned }>({
      query: ({ lease_id, payload }) => ({
        url: `/pm/leases/${lease_id}/upload-signed`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (res, _e, { lease_id }) => [
        { type: 'PmLease', id: lease_id },
        { type: 'PmLease', id: 'LIST' },
        ...(res ? [{ type: 'PmProperty' as const, id: res.property_id }] : []),
      ],
    }),

    renewPmLease: builder.mutation<Lease, { lease_id: number; payload: LeaseRenew }>({
      query: ({ lease_id, payload }) => ({
        url: `/pm/leases/${lease_id}/renew`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (res, _e, { lease_id }) => [
        { type: 'PmLease', id: lease_id },
        { type: 'PmLease', id: 'LIST' },
        { type: 'PmProperty', id: 'LIST' },
        ...(res ? [{ type: 'PmProperty' as const, id: res.property_id }] : []),
        { type: 'PmTenant', id: 'LIST' },
        { type: 'PmDashboard', id: 'LIST' },
        { type: 'PmDashboard', id: 'REPORTS' },
      ],
    }),

    terminatePmLease: builder.mutation<Lease, { lease_id: number; body?: LeaseTerminate }>({
      query: ({ lease_id, body }) => ({
        url: `/pm/leases/${lease_id}/terminate`,
        method: 'POST',
        // Backend accepts an optional `LeaseTerminate | None` body — only attach
        // it when at least one field is set.
        ...(body && (body.termination_date || body.reason) ? { body } : {}),
      }),
      invalidatesTags: (res, _e, { lease_id }) => [
        { type: 'PmLease', id: lease_id },
        { type: 'PmLease', id: 'LIST' },
        { type: 'PmProperty', id: 'LIST' },
        ...(res ? [{ type: 'PmProperty' as const, id: res.property_id }] : []),
        { type: 'PmTenant', id: 'LIST' },
        { type: 'PmDashboard', id: 'LIST' },
        { type: 'PmDashboard', id: 'REPORTS' },
      ],
      onQueryStarted: async ({ lease_id, body }, { dispatch, queryFulfilled }) => {
        // Optimistically reflect termination on the lease detail (keyed by the
        // id we have). The list refreshes via the PmLease LIST invalidation.
        const patchResult = dispatch(
          pmLeasesApi.util.updateQueryData('getPmLease', lease_id, (draft) => {
            draft.status = 'terminated'
            if (body?.termination_date) draft.termination_date = body.termination_date
            if (body?.reason) draft.termination_reason = body.reason
          })
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
    }),
  }),
})
