import { api } from '@/store/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  ManagedPropertyStatus,
  TenantStatus,
  LeaseStatus,
  RentChargeStatus,
  ExpenseCategory,
  MaintenanceRequestStatus,
  WorkOrderStatus,
  DocumentType,
  DashboardOverview,
  ActivityItem,
  PmProperty,
  PmPropertyCreate,
  ManagedPropertyUpdate,
  Lease,
  LeaseCreate,
  LeaseUploadSigned,
  LeaseRenew,
  RentChargeWithTotals,
  RentChargeGenerateRequest,
  RentPayment,
  RentPaymentCreate,
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  MaintenanceRequest,
  MaintenanceRequestCreate,
  MaintenanceRequestUpdate,
  Document,
  DocumentUpdate,
  DocumentDownload,
  InspectionChecklist,
  InspectionChecklistCreate,
  InspectionSign,
  RentRollItem,
  IncomeReport,
  ExpenseReport,
  PnLReport,
  OccupancyReport,
  MaintenanceReport,
  TenantSummary,
  TenantDetail,
  OwnerRMAssignmentCreate,
  OwnerRMAssignmentUpdate,
  OwnerRMAssignmentResponse,
  RentalApplicationForm,
  RentalApplicationFormCreate,
  RentalApplicationDecision,
  RentalApplication,
  ManagedPropertyDetail,
  PmSettings,
  PmSettingsUpdate,
} from '@/types/pm'

import type { RootState } from '@/store'

/**
 * Optimistically patch a cached PM list (across every filter combination the
 * user may have cached) and return the patches so the caller can undo them if
 * the mutation fails.
 *
 * Single implementation of the pattern that used to be copy-pasted across
 * updatePmProperty / updateMaintenanceRequest / decideApplication — a fix here
 * (e.g. tag selection or patch semantics) applies to every list endpoint.
 */
type PatchableListEndpoint = 'listPmProperties' | 'listMaintenanceRequests' | 'listApplications'
type PatchableListTag =
  | { type: 'PmProperty'; id: 'LIST' }
  | { type: 'PmMaintenanceRequest'; id: 'LIST' }
  | { type: 'PmApplication'; id: 'LIST' }

function patchCachedList(
  endpointName: PatchableListEndpoint,
  tag: PatchableListTag,
  getState: () => unknown,
  dispatch: (action: unknown) => unknown,
  update: (draft: { items: Array<{ id: number }> }) => void,
): Array<{ undo: () => void }> {
  return pmApi.util
    .selectInvalidatedBy(getState() as RootState, [tag])
    .filter((entry) => entry.endpointName === endpointName)
    .map((entry) =>
      dispatch(
        pmApi.util.updateQueryData(
          endpointName,
          // The cached entry's args are exactly the initiate args for this
          // endpoint. `never` (a subtype of every type) keeps the no-`any`
          // policy while satisfying updateQueryData's per-endpoint arg typing.
          entry.originalArgs as never,
          update as never,
        ),
      ) as { undo: () => void },
    )
}

export const pmApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPmDashboardOverview: builder.query<DashboardOverview, { owner_id?: number | null }>({
      query: ({ owner_id }) => ({
        url: '/pm/dashboard/overview',
        params: owner_id ? { owner_id } : undefined,
      }),
      providesTags: [{type: 'PmDashboard' as const, id: 'LIST'}],
      keepUnusedDataFor: 300,
    }),

    getPmDashboardActivity: builder.query<PaginatedResponse<ActivityItem>, { owner_id?: number | null; limit?: number; cursor?: string | null }>({
      query: ({ owner_id, limit, cursor }) => ({
        url: '/pm/dashboard/activity',
        params: { owner_id: owner_id || undefined, limit: limit ?? 20, cursor: cursor ?? undefined },
      }),
      providesTags: [{type: 'PmDashboard' as const, id: 'LIST'}],
      keepUnusedDataFor: 300,
    }),

    listPmProperties: builder.query<
      PaginatedResponse<PmProperty>,
      { owner_id?: number | null; occupancy?: 'occupied' | 'vacant'; q?: string; limit?: number; cursor?: string | null }
    >({
      query: ({ owner_id, occupancy, q, limit = 50, cursor = null }) => ({
        url: '/pm/properties',
        params: {
          owner_id: owner_id || undefined,
          occupancy,
          q,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((p) => ({ type: 'PmProperty' as const, id: p.id })), { type: 'PmProperty' as const, id: 'LIST' }]
          : [{ type: 'PmProperty' as const, id: 'LIST' }],
    }),

    createPmProperty: builder.mutation<
      PmProperty,
      {
        data: PmPropertyCreate
        owner_id?: number | null
        management_status?: ManagedPropertyStatus
        payment_due_day?: number
        grace_period_days?: number
      }
    >({
      query: ({ data, owner_id, management_status, payment_due_day, grace_period_days }) => ({
        url: '/pm/properties',
        method: 'POST',
        params: {
          owner_id: owner_id || undefined,
          management_status: management_status ?? 'active',
          payment_due_day: payment_due_day ?? 1,
          grace_period_days: grace_period_days ?? 5,
        },
        body: data,
      }),
      invalidatesTags: [{ type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    getPmPropertyDetail: builder.query<ManagedPropertyDetail, number>({
      query: (property_id) => `/pm/properties/${property_id}`,
      providesTags: (_res, _e, property_id) => [{ type: 'PmProperty', id: property_id }],
    }),

    updatePmProperty: builder.mutation<PmProperty, { property_id: number; payload: ManagedPropertyUpdate }>({
      query: ({ property_id, payload }) => ({
        url: `/pm/properties/${property_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { property_id }) => [{ type: 'PmProperty', id: property_id }, { type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
      onQueryStarted: async ({ property_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        // Patch every cached list entry (any filter combination) — not just a
        // single hard-coded arg key that no subscriber actually uses.
        const listPatches = patchCachedList(
          'listPmProperties',
          { type: 'PmProperty', id: 'LIST' },
          () => lifecycle.getState(),
          dispatch,
          (draft) => {
            const item = draft.items.find((p) => p.id === property_id)
            if (item) {
              const typed = item as PmProperty
              if (payload.management_status !== undefined && payload.management_status !== null) typed.management_status = payload.management_status
              if (payload.payment_due_day !== undefined && payload.payment_due_day !== null) typed.payment_due_day = payload.payment_due_day
              if (payload.grace_period_days !== undefined && payload.grace_period_days !== null) typed.grace_period_days = payload.grace_period_days
              if (payload.late_fee_policy !== undefined && payload.late_fee_policy !== null) typed.late_fee_policy = payload.late_fee_policy
            }
          },
        )
        const detailPatch = dispatch(
          pmApi.util.updateQueryData('getPmPropertyDetail', property_id, (draft) => {
            if (payload.management_status !== undefined && payload.management_status !== null) draft.property.management_status = payload.management_status
            if (payload.payment_due_day !== undefined && payload.payment_due_day !== null) draft.property.payment_due_day = payload.payment_due_day
            if (payload.grace_period_days !== undefined && payload.grace_period_days !== null) draft.property.grace_period_days = payload.grace_period_days
            if (payload.late_fee_policy !== undefined && payload.late_fee_policy !== null) draft.property.late_fee_policy = payload.late_fee_policy
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

    listPmLeases: builder.query<
      PaginatedResponse<Lease>,
      { owner_id?: number | null; property_id?: number; tenant_user_id?: number; status?: LeaseStatus; limit?: number; cursor?: string | null }
    >({
      query: ({ owner_id, property_id, tenant_user_id, status, limit = 50, cursor = null }) => ({
        url: '/pm/leases',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          tenant_user_id,
          status,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((l) => ({ type: 'PmLease' as const, id: l.id })), { type: 'PmLease' as const, id: 'LIST' }]
          : [{ type: 'PmLease' as const, id: 'LIST' }],
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
      invalidatesTags: [{ type: 'PmLease', id: 'LIST' }, { type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    uploadSignedPmLease: builder.mutation<Lease, { lease_id: number; payload: LeaseUploadSigned }>({
      query: ({ lease_id, payload }) => ({
        url: `/pm/leases/${lease_id}/upload-signed`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { lease_id }) => [{ type: 'PmLease', id: lease_id }, { type: 'PmLease', id: 'LIST' }],
    }),

    renewPmLease: builder.mutation<Lease, { lease_id: number; payload: LeaseRenew }>({
      query: ({ lease_id, payload }) => ({
        url: `/pm/leases/${lease_id}/renew`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { lease_id }) => [{ type: 'PmLease', id: lease_id }, { type: 'PmLease', id: 'LIST' }, { type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    terminatePmLease: builder.mutation<Lease, number>({
      query: (lease_id) => ({
        url: `/pm/leases/${lease_id}/terminate`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _e, lease_id) => [{ type: 'PmLease', id: lease_id }, { type: 'PmLease', id: 'LIST' }, { type: 'PmProperty', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmTenant', id: 'LIST'}],
      onQueryStarted: async (lease_id, { dispatch, queryFulfilled }) => {
        // Optimistically reflect termination on the lease detail (keyed by the
        // id we have). The list refreshes via the PmLease LIST invalidation.
        const patchResult = dispatch(
          pmApi.util.updateQueryData('getPmLease', lease_id, (draft) => {
            draft.status = 'terminated'
          })
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
    }),

    generateRentCharges: builder.mutation<{ created: number; skipped: number }, RentChargeGenerateRequest>({
      query: (payload) => ({
        url: '/pm/rent/charges/generate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmRentCharge', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    listRentCharges: builder.query<
      PaginatedResponse<RentChargeWithTotals>,
      { owner_id?: number | null; lease_id?: number; property_id?: number; status?: RentChargeStatus; limit?: number; cursor?: string | null; as_tenant?: boolean }
    >({
      query: ({ owner_id, lease_id, property_id, status, limit = 50, cursor = null, as_tenant = false }) => ({
        url: '/pm/rent/charges',
        params: {
          as_tenant,
          owner_id: owner_id || undefined,
          lease_id,
          property_id,
          status,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: 'PmRentCharge' as const, id: c.charge.id })),
              { type: 'PmRentCharge' as const, id: 'LIST' },
            ]
          : [{ type: 'PmRentCharge' as const, id: 'LIST' }],
    }),

    recordRentPayment: builder.mutation<RentPayment, RentPaymentCreate>({
      query: (payload) => ({
        url: '/pm/rent/payments',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmRentPayment', id: 'LIST' }, { type: 'PmRentCharge', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    listRentPayments: builder.query<
      PaginatedResponse<RentPayment>,
      { owner_id?: number | null; lease_id?: number; property_id?: number; limit?: number; cursor?: string | null; as_tenant?: boolean }
    >({
      query: ({ owner_id, lease_id, property_id, limit = 50, cursor = null, as_tenant = false }) => ({
        url: '/pm/rent/payments',
        params: {
          as_tenant,
          owner_id: owner_id || undefined,
          lease_id,
          property_id,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'PmRentPayment' as const, id: p.id })),
              { type: 'PmRentPayment' as const, id: 'LIST' },
            ]
          : [{ type: 'PmRentPayment' as const, id: 'LIST' }],
    }),

    createPmExpense: builder.mutation<Expense, ExpenseCreate>({
      query: (payload) => ({
        url: '/pm/expenses',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmExpense', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    listPmExpenses: builder.query<
      PaginatedResponse<Expense>,
      { owner_id?: number | null; property_id?: number; category?: ExpenseCategory; start_date?: string; end_date?: string; limit?: number; cursor?: string | null }
    >({
      query: ({ owner_id, property_id, category, start_date, end_date, limit = 50, cursor = null }) => ({
        url: '/pm/expenses',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          category,
          start_date,
          end_date,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((e) => ({ type: 'PmExpense' as const, id: e.id })), { type: 'PmExpense' as const, id: 'LIST' }]
          : [{ type: 'PmExpense' as const, id: 'LIST' }],
    }),

    deletePmExpense: builder.mutation<void, number>({
      query: (expense_id) => ({
        url: `/pm/expenses/${expense_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, expense_id) => [{ type: 'PmExpense' as const, id: expense_id }, { type: 'PmExpense' as const, id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    updatePmExpense: builder.mutation<Expense, { expense_id: number; payload: ExpenseUpdate }>({
      query: ({ expense_id, payload }) => ({
        url: `/pm/expenses/${expense_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { expense_id }) => [{ type: 'PmExpense', id: expense_id }, { type: 'PmExpense', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    createMaintenanceRequest: builder.mutation<MaintenanceRequest, MaintenanceRequestCreate>({
      query: (payload) => ({
        url: '/pm/maintenance/requests',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmMaintenanceRequest', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    listMaintenanceRequests: builder.query<
      PaginatedResponse<MaintenanceRequest>,
      {
        owner_id?: number | null
        property_id?: number
        lease_id?: number
        request_status?: MaintenanceRequestStatus
        work_order_status?: WorkOrderStatus
        limit?: number
        cursor?: string | null
      }
    >({
      query: ({ owner_id, property_id, lease_id, request_status, work_order_status, limit = 50, cursor = null }) => ({
        url: '/pm/maintenance/requests',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          lease_id,
          request_status,
          work_order_status,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((r) => ({ type: 'PmMaintenanceRequest' as const, id: r.id })),
              { type: 'PmMaintenanceRequest' as const, id: 'LIST' },
            ]
          : [{ type: 'PmMaintenanceRequest' as const, id: 'LIST' }],
    }),

    deleteMaintenanceRequest: builder.mutation<void, number>({
      query: (request_id) => ({
        url: `/pm/maintenance/requests/${request_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, request_id) => [{ type: 'PmMaintenanceRequest' as const, id: request_id }, { type: 'PmMaintenanceRequest' as const, id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    updateMaintenanceRequest: builder.mutation<
      MaintenanceRequest,
      { request_id: number; payload: MaintenanceRequestUpdate }
    >({
      query: ({ request_id, payload }) => ({
        url: `/pm/maintenance/requests/${request_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { request_id }) => [{ type: 'PmMaintenanceRequest', id: request_id }, { type: 'PmMaintenanceRequest', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
      onQueryStarted: async ({ request_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        const patches = patchCachedList(
          'listMaintenanceRequests',
          { type: 'PmMaintenanceRequest', id: 'LIST' },
          () => lifecycle.getState(),
          dispatch,
          (draft) => {
            const item = draft.items.find((r) => r.id === request_id)
            if (item) {
              const typed = item as MaintenanceRequest
              if (payload.request_status !== undefined && payload.request_status !== null) typed.request_status = payload.request_status
              if (payload.work_order_status !== undefined && payload.work_order_status !== null) typed.work_order_status = payload.work_order_status
              if (payload.priority !== undefined && payload.priority !== null) typed.priority = payload.priority
              if (payload.assigned_agent_id !== undefined && payload.assigned_agent_id !== null) typed.assigned_agent_id = payload.assigned_agent_id
              if (payload.estimated_cost !== undefined && payload.estimated_cost !== null) typed.estimated_cost = payload.estimated_cost
              if (payload.actual_cost !== undefined && payload.actual_cost !== null) typed.actual_cost = payload.actual_cost
              if (payload.scheduled_for !== undefined && payload.scheduled_for !== null) typed.scheduled_for = payload.scheduled_for
              if (payload.completion_notes !== undefined && payload.completion_notes !== null) typed.completion_notes = payload.completion_notes
            }
          },
        )
        try {
          await queryFulfilled
        } catch {
          patches.forEach((p) => p.undo())
        }
      },
    }),

    uploadPmDocument: builder.mutation<Document, FormData>({
      query: (formData) => ({
        url: '/pm/documents/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'PmDocument', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    listPmDocuments: builder.query<
      PaginatedResponse<Document>,
      {
        owner_id?: number | null
        property_id?: number
        lease_id?: number
        user_id?: number
        maintenance_request_id?: number
        rental_application_id?: number
        document_type?: DocumentType
        limit?: number
        cursor?: string | null
      }
    >({
      query: ({ owner_id, property_id, lease_id, user_id, maintenance_request_id, rental_application_id, document_type, limit = 50, cursor = null }) => ({
        url: '/pm/documents',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          lease_id,
          user_id,
          maintenance_request_id,
          rental_application_id,
          document_type,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((d) => ({ type: 'PmDocument' as const, id: d.id })), { type: 'PmDocument' as const, id: 'LIST' }]
          : [{ type: 'PmDocument' as const, id: 'LIST' }],
    }),

    deletePmDocument: builder.mutation<void, number>({
      query: (document_id) => ({
        url: `/pm/documents/${document_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, document_id) => [{ type: 'PmDocument' as const, id: document_id }, { type: 'PmDocument' as const, id: 'LIST' }],
    }),

    updatePmDocument: builder.mutation<Document, { document_id: number; payload: DocumentUpdate }>({
      query: ({ document_id, payload }) => ({
        url: `/pm/documents/${document_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { document_id }) => [{ type: 'PmDocument', id: document_id }, { type: 'PmDocument', id: 'LIST' }],
    }),

    getPmDocumentDownloadUrl: builder.query<DocumentDownload, number>({
      query: (document_id) => `/pm/documents/${document_id}/download`,
      providesTags: (_res, _e, document_id) => [{ type: 'PmDocument', id: document_id }],
    }),

    createPmInspection: builder.mutation<InspectionChecklist, InspectionChecklistCreate>({
      query: (payload) => ({
        url: '/pm/inspections',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmInspection', id: 'LIST' }],
    }),

    listPmInspections: builder.query<
      PaginatedResponse<InspectionChecklist>,
      { owner_id?: number | null; lease_id?: number; property_id?: number; limit?: number; cursor?: string | null }
    >({
      query: ({ owner_id, lease_id, property_id, limit = 50, cursor = null }) => ({
        url: '/pm/inspections',
        params: {
          owner_id: owner_id || undefined,
          lease_id,
          property_id,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
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

    getRentRollReport: builder.query<RentRollItem[], { owner_id?: number | null }>({
      query: ({ owner_id }) => ({
        url: '/pm/reports/rent-roll',
        params: owner_id ? { owner_id } : undefined,
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getIncomeReport: builder.query<IncomeReport, { owner_id?: number | null; start?: string; end?: string }>({
      query: ({ owner_id, start, end }) => ({
        url: '/pm/reports/income',
        params: {
          owner_id: owner_id || undefined,
          start,
          end,
        },
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getExpenseReport: builder.query<ExpenseReport, { owner_id?: number | null; start?: string; end?: string }>({
      query: ({ owner_id, start, end }) => ({
        url: '/pm/reports/expenses',
        params: {
          owner_id: owner_id || undefined,
          start,
          end,
        },
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getPnLReport: builder.query<PnLReport, { owner_id?: number | null; start?: string; end?: string }>({
      query: ({ owner_id, start, end }) => ({
        url: '/pm/reports/pnl',
        params: {
          owner_id: owner_id || undefined,
          start,
          end,
        },
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getOccupancyReport: builder.query<OccupancyReport, { owner_id?: number | null }>({
      query: ({ owner_id }) => ({
        url: '/pm/reports/occupancy',
        params: owner_id ? { owner_id } : undefined,
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getMaintenanceReport: builder.query<MaintenanceReport, { owner_id?: number | null }>({
      query: ({ owner_id }) => ({
        url: '/pm/reports/maintenance',
        params: owner_id ? { owner_id } : undefined,
      }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    listPmTenants: builder.query<PaginatedResponse<TenantSummary>, { owner_id?: number | null; limit?: number; cursor?: string | null }>({
      query: ({ owner_id, limit = 50, cursor = null }) => ({
        url: '/pm/tenants',
        params: {
          owner_id: owner_id || undefined,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: [{type: 'PmProperty', id: 'TENANTS'}],
    }),

    getPmTenantDetail: builder.query<TenantDetail, { tenant_user_id: number; owner_id?: number | null }>({
      query: ({ tenant_user_id, owner_id }) => ({
        url: `/pm/tenants/${tenant_user_id}`,
        params: { owner_id: owner_id || undefined },
      }),
      providesTags: (_result, _error, arg) => [{type: 'PmProperty', id: 'TENANTS'}, {type: 'PmProperty', id: `TENANT-${arg.tenant_user_id}`}],
    }),

    createRMAssignment: builder.mutation<OwnerRMAssignmentResponse, OwnerRMAssignmentCreate>({
      query: (payload) => ({
        url: '/pm/assignments',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{type: 'PmAssignment', id: 'LIST'}, { type: 'User', id: 'LIST' }],
    }),

    listRMAssignments: builder.query<PaginatedResponse<OwnerRMAssignmentResponse>, { owner_id?: number | null; cursor?: string | null; limit?: number }>({
      query: ({ owner_id, cursor, limit }) => ({
        url: '/pm/assignments',
        params: { owner_id: owner_id || undefined, cursor: cursor ?? undefined, limit },
      }),
      providesTags: [{type: 'PmAssignment' as const, id: 'LIST'}],
    }),

    deletePmProperty: builder.mutation<void, number>({
      query: (property_id) => ({
        url: `/pm/properties/${property_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, property_id) => [{ type: 'PmProperty' as const, id: property_id }, { type: 'PmProperty' as const, id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    updateRMAssignment: builder.mutation<
      OwnerRMAssignmentResponse,
      { owner_user_id: number; payload: OwnerRMAssignmentUpdate }
    >({
      query: ({ owner_user_id, payload }) => ({
        url: `/pm/assignments/${owner_user_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { owner_user_id }) => [
        {type: 'PmAssignment', id: 'LIST'},
        { type: 'User', id: owner_user_id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    createApplicationForm: builder.mutation<RentalApplicationForm, RentalApplicationFormCreate>({
      query: (payload) => ({
        url: '/pm/applications/forms',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{type: 'PmApplicationForm', id: 'LIST'}],
    }),

    listApplicationForms: builder.query<
      PaginatedResponse<RentalApplicationForm>,
      { owner_id?: number | null; property_id?: number; q?: string; limit?: number; cursor?: string | null }
    >({
      query: ({ owner_id, property_id, q, limit = 50, cursor = null }) => ({
        url: '/pm/applications/forms',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          q,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: [{type: 'PmApplicationForm' as const, id: 'LIST'}],
    }),

    getApplicationForm: builder.query<RentalApplicationForm, number>({
      query: (form_id) => `/pm/applications/forms/${form_id}`,
      providesTags: (_res, _e, form_id) => [{ type: 'PmApplicationForm', id: form_id }],
    }),

    listApplications: builder.query<
      PaginatedResponse<RentalApplication>,
      {
        owner_id?: number | null
        property_id?: number
        status?: TenantStatus
        submitted_from?: string
        submitted_to?: string
        limit?: number
        cursor?: string | null
      }
    >({
      query: ({ owner_id, property_id, status, submitted_from, submitted_to, limit = 50, cursor = null }) => ({
        url: '/pm/applications',
        params: {
          owner_id: owner_id || undefined,
          property_id,
          status,
          submitted_from,
          submitted_to,
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: [{type: 'PmApplication' as const, id: 'LIST'}],
    }),

    getApplication: builder.query<RentalApplication, number>({
      query: (application_id) => `/pm/applications/${application_id}`,
      providesTags: (_res, _e, application_id) => [{ type: 'PmApplication', id: application_id }],
    }),

    deleteApplicationForm: builder.mutation<void, number>({
      query: (form_id) => ({
        url: `/pm/applications/forms/${form_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, form_id) => [{ type: 'PmApplicationForm' as const, id: form_id }, { type: 'PmApplicationForm' as const, id: 'LIST' }],
    }),

    deleteApplication: builder.mutation<void, number>({
      query: (application_id) => ({
        url: `/pm/applications/${application_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, application_id) => [{ type: 'PmApplication' as const, id: application_id }, { type: 'PmApplication' as const, id: 'LIST' }],
    }),

    decideApplication: builder.mutation<RentalApplication, { application_id: number; payload: RentalApplicationDecision }>({
      query: ({ application_id, payload }) => ({
        url: `/pm/applications/${application_id}/decision`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{type: 'PmApplication', id: 'LIST'}],
      onQueryStarted: async ({ application_id, payload }, lifecycle) => {
        const { dispatch, queryFulfilled } = lifecycle
        const patches = patchCachedList(
          'listApplications',
          { type: 'PmApplication', id: 'LIST' },
          () => lifecycle.getState(),
          dispatch,
          (draft) => {
            const item = draft.items.find((a) => a.id === application_id)
            if (item) {
              const typed = item as RentalApplication
              typed.status = payload.decision
              typed.decision_at = new Date().toISOString()
            }
          },
        )
        try {
          await queryFulfilled
        } catch {
          patches.forEach((p) => p.undo())
        }
      },
    }),

    // PM Settings
    getPmSettings: builder.query<PmSettings, { owner_id?: number | null } | void>({
      query: (args) => ({
        url: '/pm/settings',
        params: args?.owner_id ? { owner_id: args.owner_id } : undefined,
      }),
      providesTags: [{ type: 'PmSettings' as const, id: 'LIST' }],
    }),

    updatePmSettings: builder.mutation<PmSettings, { owner_id?: number | null; payload: PmSettingsUpdate }>({
      query: ({ owner_id, payload }) => ({
        url: '/pm/settings',
        method: 'PUT',
        body: payload,
        params: owner_id ? { owner_id } : undefined,
      }),
      invalidatesTags: [{ type: 'PmSettings' as const, id: 'LIST' }],
    }),
  }),
})

export const {
  useGetPmDashboardOverviewQuery,
  useGetPmDashboardActivityQuery,
  useListPmPropertiesQuery,
  useCreatePmPropertyMutation,
  useGetPmPropertyDetailQuery,
  useUpdatePmPropertyMutation,
  useListPmLeasesQuery,
  useGetPmLeaseQuery,
  useCreatePmLeaseMutation,
  useUploadSignedPmLeaseMutation,
  useRenewPmLeaseMutation,
  useTerminatePmLeaseMutation,
  useGenerateRentChargesMutation,
  useListRentChargesQuery,
  useRecordRentPaymentMutation,
  useListRentPaymentsQuery,
  useCreatePmExpenseMutation,
  useListPmExpensesQuery,
  useUpdatePmExpenseMutation,
  useDeletePmExpenseMutation,
  useCreateMaintenanceRequestMutation,
  useListMaintenanceRequestsQuery,
  useUpdateMaintenanceRequestMutation,
  useDeleteMaintenanceRequestMutation,
  useUploadPmDocumentMutation,
  useListPmDocumentsQuery,
  useUpdatePmDocumentMutation,
  useDeletePmDocumentMutation,
  useGetPmDocumentDownloadUrlQuery,
  useCreatePmInspectionMutation,
  useListPmInspectionsQuery,
  useGetPmInspectionQuery,
  useSignPmInspectionMutation,
  useGetRentRollReportQuery,
  useGetIncomeReportQuery,
  useGetExpenseReportQuery,
  useGetPnLReportQuery,
  useGetOccupancyReportQuery,
  useGetMaintenanceReportQuery,
  useListPmTenantsQuery,
  useGetPmTenantDetailQuery,
  useCreateRMAssignmentMutation,
  useListRMAssignmentsQuery,
  useUpdateRMAssignmentMutation,
  useDeletePmPropertyMutation,
  useCreateApplicationFormMutation,
  useListApplicationFormsQuery,
  useGetApplicationFormQuery,
  useListApplicationsQuery,
  useGetApplicationQuery,
  useDeleteApplicationFormMutation,
  useDeleteApplicationMutation,
  useDecideApplicationMutation,
  useGetPmSettingsQuery,
  useUpdatePmSettingsMutation,
} = pmApi
