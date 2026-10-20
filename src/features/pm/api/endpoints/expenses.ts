import { pmRentApi } from './rent'
import type { PaginatedResponse } from '@/types/api'
import type { Expense, ExpenseCreate, ExpenseUpdate, PmExpensesQuery } from '@/types/pm'
import { withPageLimit } from './pmParams'

export const pmExpensesApi = pmRentApi.injectEndpoints({
  endpoints: (builder) => ({
    createPmExpense: builder.mutation<Expense, ExpenseCreate>({
      query: (payload) => ({
        url: '/pm/expenses',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PmExpense', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    listPmExpenses: builder.query<PaginatedResponse<Expense>, PmExpensesQuery>({
      query: (args) => ({ url: '/pm/expenses', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((e) => ({ type: 'PmExpense' as const, id: e.id })), { type: 'PmExpense' as const, id: 'LIST' }]
          : [{ type: 'PmExpense' as const, id: 'LIST' }],
    }),

    // 204 with no body. Same authorization as PATCH.
    deletePmExpense: builder.mutation<void, number>({
      query: (expense_id) => ({
        url: `/pm/expenses/${expense_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, expense_id) => [{ type: 'PmExpense' as const, id: expense_id }, { type: 'PmExpense' as const, id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),

    updatePmExpense: builder.mutation<Expense, { expense_id: number; payload: ExpenseUpdate }>({
      query: ({ expense_id, payload }) => ({
        url: `/pm/expenses/${expense_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { expense_id }) => [{ type: 'PmExpense', id: expense_id }, { type: 'PmExpense', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}, {type: 'PmDashboard', id: 'REPORTS'}],
    }),
  }),
})
