import { pmReportsApi } from './reports'
import type { PaginatedResponse } from '@/types/api'
import type {
  PmApplicationFormsQuery,
  PmApplicationsQuery,
  RentalApplication,
  RentalApplicationDecision,
  RentalApplicationForm,
  RentalApplicationFormCreate,
} from '@/types/pm'
import type { RootState } from '@/store'
import { patchCachedEntries } from './pmCache'
import { withPageLimit } from './pmParams'

// The backend has no DELETE for an application or a form. Reject an application with a decision.
export const pmApplicationsApi = pmReportsApi.injectEndpoints({
  endpoints: (builder) => ({
    // 201 with the form. `custom_fields` replaces the old `questions` (sending `questions` gives 422).
    createApplicationForm: builder.mutation<RentalApplicationForm, RentalApplicationFormCreate>({
      query: (payload) => ({
        url: '/pm/applications/forms',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{type: 'PmApplicationForm', id: 'LIST'}],
    }),

    listApplicationForms: builder.query<PaginatedResponse<RentalApplicationForm>, PmApplicationFormsQuery>({
      query: (args) => ({ url: '/pm/applications/forms', params: withPageLimit(args) }),
      providesTags: [{type: 'PmApplicationForm' as const, id: 'LIST'}],
    }),

    // `form_id` filters the inbox to one form. `status` is applicant, approved or rejected.
    listApplications: builder.query<PaginatedResponse<RentalApplication>, PmApplicationsQuery>({
      query: (args) => ({ url: '/pm/applications', params: withPageLimit(args) }),
      providesTags: [{type: 'PmApplication' as const, id: 'LIST'}],
    }),

    getApplication: builder.query<RentalApplication, number>({
      query: (application_id) => `/pm/applications/${application_id}`,
      providesTags: (_res, _e, application_id) => [{ type: 'PmApplication', id: application_id }],
    }),

    decideApplication: builder.mutation<RentalApplication, { application_id: number; payload: RentalApplicationDecision }>({
      query: ({ application_id, payload }) => ({
        url: `/pm/applications/${application_id}/decision`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_res, _error, { application_id }) => [
        { type: 'PmApplication', id: application_id },
        { type: 'PmApplication', id: 'LIST' },
      ],
      onQueryStarted: async ({ application_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        const patches = patchCachedEntries(
          pmApplicationsApi.util.selectInvalidatedBy(lifecycle.getState() as RootState, [{ type: 'PmApplication', id: 'LIST' }]),
          'listApplications',
          (args) => dispatch(pmApplicationsApi.util.updateQueryData('listApplications', args as never, (draft) => {
            const item = draft.items.find((a) => a.id === application_id)
            if (item) {
              item.status = payload.decision
              item.decision_at = new Date().toISOString()
              if (payload.notes) item.decision_notes = payload.notes
            }
          })),
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
