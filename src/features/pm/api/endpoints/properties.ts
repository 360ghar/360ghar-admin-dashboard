import { pmDashboardApi } from './dashboard'
import type { PaginatedResponse } from '@/types/api'
import type { ManagedPropertyDetail, ManagedPropertyUpdate, PmProperty, PmPropertiesQuery, PmPropertyCreate } from '@/types/pm'
import type { RootState } from '@/store'
import { patchCachedEntries } from './pmCache'
import { withPageLimit } from './pmParams'

/** Apply the PM terms of a PATCH to a cached property. Null never reaches these NOT NULL fields (the backend gives 422). */
function applyManagedTerms(target: PmProperty, payload: ManagedPropertyUpdate): void {
  if (payload.management_status != null) target.management_status = payload.management_status
  if (payload.payment_due_day != null) target.payment_due_day = payload.payment_due_day
  if (payload.grace_period_days != null) target.grace_period_days = payload.grace_period_days
  if (payload.late_fee_policy !== undefined) target.late_fee_policy = payload.late_fee_policy
}

export const pmPropertiesApi = pmDashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    listPmProperties: builder.query<PaginatedResponse<PmProperty>, PmPropertiesQuery>({
      query: (args) => ({ url: '/pm/properties', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((p) => ({ type: 'PmProperty' as const, id: p.id })), { type: 'PmProperty' as const, id: 'LIST' }]
          : [{ type: 'PmProperty' as const, id: 'LIST' }],
    }),

    // The owner, management status, due day, grace period and late fee policy are body fields. 201 with the property.
    createPmProperty: builder.mutation<PmProperty, PmPropertyCreate>({
      query: (body) => ({ url: '/pm/properties', method: 'POST', body }),
      invalidatesTags: [{ type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getPmPropertyDetail: builder.query<ManagedPropertyDetail, number>({
      query: (property_id) => `/pm/properties/${property_id}`,
      providesTags: (_res, _e, property_id) => [{ type: 'PmProperty', id: property_id }],
    }),

    // PATCH: send only the keys that changed. An explicit null clears a nullable field.
    // The backend has no DELETE: archive a property with `management_status: 'archived'`.
    updatePmProperty: builder.mutation<PmProperty, { property_id: number; payload: ManagedPropertyUpdate }>({
      query: ({ property_id, payload }) => ({
        url: `/pm/properties/${property_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { property_id }) => [{ type: 'PmProperty', id: property_id }, { type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
      onQueryStarted: async ({ property_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        // Patch every cached list entry (any filter combination) — not just a
        // single hard-coded arg key that no subscriber actually uses.
        const listPatches = patchCachedEntries(
          pmPropertiesApi.util.selectInvalidatedBy(lifecycle.getState() as RootState, [{ type: 'PmProperty', id: 'LIST' }]),
          'listPmProperties',
          (args) => dispatch(pmPropertiesApi.util.updateQueryData('listPmProperties', args as never, (draft) => {
            const item = draft.items.find((p) => p.id === property_id)
            if (item) applyManagedTerms(item, payload)
          })),
        )
        const detailPatch = dispatch(
          pmPropertiesApi.util.updateQueryData('getPmPropertyDetail', property_id, (draft) => {
            applyManagedTerms(draft.property, payload)
          })
        )
        try {
          await queryFulfilled
        } catch {
          listPatches.forEach((p) => p.undo())
          detailPatch.undo()
        }
      },
    }),
  }),
})
