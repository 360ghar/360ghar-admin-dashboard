import { api } from '@/store/api'
import type { AgentSystemStats, AgentWorkload } from '@/types/api'

/** Normalize workload payloads that may be a bare array or a wrapped object. */
function normalizeWorkload(response: unknown): AgentWorkload[] {
  if (Array.isArray(response)) return response as AgentWorkload[]
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as AgentWorkload[]
    if (Array.isArray(obj.load_distribution)) return obj.load_distribution as AgentWorkload[]
    if (Array.isArray(obj.data)) return obj.data as AgentWorkload[]
  }
  return []
}

export const systemApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSystemStats: builder.query<AgentSystemStats, void>({
      query: () => '/agents/system/stats',
      providesTags: [{type: 'Agent' as const, id: 'LIST'}, {type: 'PmDashboard' as const, id: 'SYSTEM_STATS'}],
      keepUnusedDataFor: 300,
    }),
    getWorkload: builder.query<AgentWorkload[], void>({
      query: () => '/agents/system/workload',
      transformResponse: (response: unknown) => normalizeWorkload(response),
      providesTags: [{type: 'Agent' as const, id: 'LIST'}, {type: 'PmDashboard' as const, id: 'SYSTEM_WORKLOAD'}],
      keepUnusedDataFor: 300,
    }),
  }),
})

export const { useGetSystemStatsQuery, useGetWorkloadQuery } = systemApi

