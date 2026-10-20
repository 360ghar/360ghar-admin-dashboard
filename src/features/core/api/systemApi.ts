import { api } from '@/store/api'
import { fetchAllPages } from '@/store/fetchAllPages'
import type { AgentSystemStats, AgentWorkload } from '@/types/api'

export const systemApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSystemStats: builder.query<AgentSystemStats, void>({
      query: () => '/agents/system/stats',
      providesTags: [{type: 'Agent' as const, id: 'LIST'}, {type: 'PmDashboard' as const, id: 'SYSTEM_STATS'}],
      keepUnusedDataFor: 300, // Retain dashboard data for back navigation; freshness follows base API settings.
    }),
    // The workload route is a CursorPage. Utilization and auto-assign need a row
    // for every agent, so walk next_cursor until has_more is false.
    getWorkload: builder.query<AgentWorkload[], void>({
      queryFn: (_arg, _api, _extra, baseQuery) => fetchAllPages<AgentWorkload>(baseQuery, '/agents/system/workload'),
      providesTags: [{type: 'Agent' as const, id: 'LIST'}, {type: 'PmDashboard' as const, id: 'SYSTEM_WORKLOAD'}],
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useGetSystemStatsQuery, useGetWorkloadQuery } = systemApi
