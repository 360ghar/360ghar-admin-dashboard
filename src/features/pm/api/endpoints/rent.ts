import { pmLeasesApi } from './leases'
import type { PaginatedResponse } from '@/types/api'
import type {
  RentChargeGenerateRequest,
  RentChargeGenerateResult,
  RentChargesQuery,
  RentChargeWithTotals,
  RentPayment,
  RentPaymentCreate,
  RentPaymentsQuery,
} from '@/types/pm'
import { withPageLimit } from './pmParams'

/** A settled or rejected claim changes the payment list, the charge balances and the dashboard totals. */
const paymentChangeTags = (payment_id: number) => [
  { type: 'PmRentPayment' as const, id: payment_id },
  { type: 'PmRentPayment' as const, id: 'LIST' },
  { type: 'PmRentCharge' as const, id: 'LIST' },
  { type: 'PmDashboard' as const, id: 'LIST' },
  { type: 'PmDashboard' as const, id: 'REPORTS' },
]

export const pmRentApi = pmLeasesApi.injectEndpoints({
  endpoints: (builder) => ({
    // `start_month` must be the first day of a month (YYYY-MM-01); any other day gives 422.
    generateRentCharges: builder.mutation<RentChargeGenerateResult, RentChargeGenerateRequest>({
      query: (payload) => ({
        url: '/pm/rent/charges/generate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmRentCharge', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    listRentCharges: builder.query<PaginatedResponse<RentChargeWithTotals>, RentChargesQuery>({
      query: (args) => ({ url: '/pm/rent/charges', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: 'PmRentCharge' as const, id: c.charge.id })),
              { type: 'PmRentCharge' as const, id: 'LIST' },
            ]
          : [{ type: 'PmRentCharge' as const, id: 'LIST' }],
    }),

    // 201 with the payment. An owner, agent or admin payment is settled at once.
    recordRentPayment: builder.mutation<RentPayment, RentPaymentCreate>({
      query: (payload) => ({
        url: '/pm/rent/payments',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmRentPayment', id: 'LIST' }, { type: 'PmRentCharge', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    // Owner, agent or admin confirms a pending tenant claim. 200 with the settled payment.
    settleRentPayment: builder.mutation<RentPayment, number>({
      query: (payment_id) => ({ url: `/pm/rent/payments/${payment_id}/settle`, method: 'POST' }),
      invalidatesTags: (_res, _e, payment_id) => paymentChangeTags(payment_id),
    }),

    // Rejects a pending tenant claim. 204 with no body. The backend refuses a settled payment (400).
    rejectRentPayment: builder.mutation<void, number>({
      query: (payment_id) => ({ url: `/pm/rent/payments/${payment_id}`, method: 'DELETE' }),
      invalidatesTags: (_res, _e, payment_id) => paymentChangeTags(payment_id),
    }),

    listRentPayments: builder.query<PaginatedResponse<RentPayment>, RentPaymentsQuery>({
      query: (args) => ({ url: '/pm/rent/payments', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'PmRentPayment' as const, id: p.id })),
              { type: 'PmRentPayment' as const, id: 'LIST' },
            ]
          : [{ type: 'PmRentPayment' as const, id: 'LIST' }],
    }),
  }),
})
