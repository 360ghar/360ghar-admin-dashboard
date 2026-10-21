import { pmInspectionsApi } from './inspections'
import { fetchAllPages } from '@/store/fetchAllPages'
import type { PaginatedResponse } from '@/types/api'
import type {
  ExpenseReport,
  IncomeReport,
  MaintenanceReport,
  OccupancyReport,
  PnLReport,
  PmOwnerQuery,
  PmReportQuery,
  RentRollItem,
  RentRollQuery,
} from '@/types/pm'
import { withPageLimit } from './pmParams'

// Income, expense and P&L take the same `start` and `end` dates (YYYY-MM-DD), and `end` is inclusive
// through its last moment, so the three totals of one range agree.
export const pmReportsApi = pmInspectionsApi.injectEndpoints({
  endpoints: (builder) => ({
    // One CursorPage of the rent roll (a preview). A full export reads every page: see `getAllRentRollItems`.
    getRentRollReport: builder.query<PaginatedResponse<RentRollItem>, RentRollQuery>({
      query: (args) => ({ url: '/pm/reports/rent-roll', params: withPageLimit(args) }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    // Every rent roll row, for the CSV export: follows next_cursor.
    getAllRentRollItems: builder.query<RentRollItem[], { owner_id?: number | null }>({
      queryFn: ({ owner_id }, _api, _extra, baseQuery) =>
        fetchAllPages<RentRollItem>(baseQuery, '/pm/reports/rent-roll', { owner_id }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getIncomeReport: builder.query<IncomeReport, PmReportQuery>({
      query: (params) => ({ url: '/pm/reports/income', params }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getExpenseReport: builder.query<ExpenseReport, PmReportQuery>({
      query: (params) => ({ url: '/pm/reports/expenses', params }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getPnLReport: builder.query<PnLReport, PmReportQuery>({
      query: (params) => ({ url: '/pm/reports/pnl', params }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getOccupancyReport: builder.query<OccupancyReport, PmOwnerQuery>({
      query: (params) => ({ url: '/pm/reports/occupancy', params }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),

    getMaintenanceReport: builder.query<MaintenanceReport, PmOwnerQuery>({
      query: (params) => ({ url: '/pm/reports/maintenance', params }),
      providesTags: [{type: 'PmDashboard', id: 'REPORTS'}],
    }),
  }),
})
