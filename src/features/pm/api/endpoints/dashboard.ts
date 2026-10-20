import { api } from '@/store/api'
import type { PaginatedResponse } from '@/types/api'
import type { ActivityItem, DashboardOverview, PmActivityQuery, PmOwnerQuery } from '@/types/pm'

export const pmDashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPmDashboardOverview: builder.query<DashboardOverview, PmOwnerQuery>({
      query: (params) => ({ url: '/pm/dashboard/overview', params }),
      providesTags: [{type: 'PmDashboard' as const, id: 'LIST'}],
      keepUnusedDataFor: 300,
    }),

    getPmDashboardActivity: builder.query<PaginatedResponse<ActivityItem>, PmActivityQuery>({
      query: (params) => ({ url: '/pm/dashboard/activity', params: { ...params, limit: params.limit ?? 20 } }),
      providesTags: [{type: 'PmDashboard' as const, id: 'LIST'}],
      keepUnusedDataFor: 300,
    }),
  }),
})
