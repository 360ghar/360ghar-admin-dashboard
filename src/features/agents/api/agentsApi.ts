import { api } from '@/store/api'
import { fetchAllPages } from '@/store/fetchAllPages'
import type {
  Agent,
  AgentAvailabilityUpdate,
  AgentCreate,
  AgentUpdate,
  AgentWithStats,
  AgentsQuery,
  PaginatedResponse,
} from '@/types/api'

export const agentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // List agents (admin only) — uniform cursor-paginated response
    listAgents: builder.query<PaginatedResponse<Agent>, AgentsQuery | void>({
      query: (params) => ({
        url: '/agents',
        params: { limit: 20, ...(params || {}) },
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((a) => ({ type: 'Agent' as const, id: a.id })),
              { type: 'Agent' as const, id: 'LIST' },
            ]
          : [{ type: 'Agent' as const, id: 'LIST' }],
    }),

    // Every agent, for pickers and filters that need the whole set: follows next_cursor.
    listAllAgents: builder.query<Agent[], { include_inactive?: boolean } | void>({
      queryFn: (params, _api, _extra, baseQuery) =>
        fetchAllPages<Agent>(baseQuery, '/agents', { ...(params || {}) }),
      providesTags: [{ type: 'Agent' as const, id: 'LIST' }],
    }),

    // Get agent by ID
    getAgent: builder.query<Agent, number>({
      query: (id) => `/agents/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Agent' as const, id: arg}],
    }),

    // Create agent (admin only). 201 with the agent.
    createAgent: builder.mutation<Agent, AgentCreate>({
      query: (data) => ({ url: '/agents', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
    }),

    // Update agent (admin only). PATCH-style: send only the keys that changed; null clears.
    updateAgent: builder.mutation<Agent, { id: number; data: AgentUpdate }>({
      query: ({ id, data }) => ({ url: `/agents/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'Agent', id }, { type: 'Agent', id: 'LIST' }],
    }),

    // Delete agent (soft delete, admin only). 204 with no body.
    deleteAgent: builder.mutation<void, number>({
      query: (id) => ({ url: `/agents/${id}`, method: 'DELETE' }),
      invalidatesTags: (_res, _error, id) => [
        { type: 'Agent', id },
        { type: 'Agent', id: 'LIST' },
      ],
    }),

    // Toggle agent availability (admin only). JSON body `{ is_available }`, returns the agent.
    toggleAgentAvailability: builder.mutation<Agent, { agentId: number; isAvailable: boolean }>({
      query: ({ agentId, isAvailable }) => {
        const body: AgentAvailabilityUpdate = { is_available: isAvailable }
        return { url: `/agents/${agentId}/availability`, method: 'PATCH', body }
      },
      invalidatesTags: (_res, _e, { agentId }) => [
        { type: 'Agent', id: agentId },
        { type: 'Agent', id: 'LIST' },
      ],
    }),

    // Get agent profile (current user)
    getAgentProfile: builder.query<Agent, void>({
      query: () => '/agents/me',
      providesTags: (res) =>
        res
          ? [
              { type: 'Agent' as const, id: res.id },
              { type: 'Agent' as const, id: 'PROFILE' },
            ]
          : [{ type: 'Agent' as const, id: 'PROFILE' }],
    }),

    // Get the agent assigned to the current user. The backend answers 404 when none is assigned.
    getAssignedAgent: builder.query<Agent, void>({
      query: () => '/agents/assigned',
      providesTags: (res) =>
        res
          ? [
              { type: 'Agent' as const, id: res.id },
              { type: 'Agent' as const, id: 'ASSIGNED' },
            ]
          : [{ type: 'Agent' as const, id: 'ASSIGNED' }],
    }),

    // Get agent with stats
    getAgentStats: builder.query<AgentWithStats, number>({
      query: (id) => `/agents/${id}/stats`,
      providesTags: (_result, _error, arg) => [{type: 'Agent' as const, id: arg}]
    }),
  }),
})

export const {
  useListAgentsQuery,
  useListAllAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useToggleAgentAvailabilityMutation,
  useGetAgentProfileQuery,
  useGetAssignedAgentQuery,
  useGetAgentStatsQuery,
} = agentsApi
