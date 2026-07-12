import { api } from '@/store/api'
import type {
  Agent,
  AgentWithStats,
  AgentCreate,
  PaginatedResponse,
  Visit
} from '@/types/api'

export interface AgentSummary {
  id: number
  name: string
  contact_number?: string
  languages?: string[]
  agent_type: 'general' | 'specialist' | 'senior'
  experience_level: 'beginner' | 'intermediate' | 'expert'
  is_active: boolean
  is_available: boolean
  total_users_assigned: number
  user_satisfaction_rating: number
  created_at: string
  updated_at?: string
}

export const agentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // List agents (admin only) — uniform cursor-paginated response
    listAgents: builder.query<PaginatedResponse<AgentSummary>, { include_inactive?: boolean; cursor?: string | null; limit?: number } | void>({
      query: (params) => ({
        url: '/agents',
        params: { limit: 20, ...(params || {}) } as Record<string, unknown>
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((a) => ({ type: 'Agent' as const, id: a.id })),
              { type: 'Agent' as const, id: 'LIST' },
            ]
          : [{ type: 'Agent' as const, id: 'LIST' }],
    }),

    // Get agent by ID
    getAgent: builder.query<Agent, number>({
      query: (id) => `/agents/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Agent' as const, id: arg}],
    }),

    // Create agent (admin only)
    createAgent: builder.mutation<Agent, AgentCreate>({
      query: (data) => ({ url: '/agents', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
    }),

    // Update agent (admin only)
    updateAgent: builder.mutation<Agent, { id: number; data: Partial<Agent> }>({
      query: ({ id, data }) => ({ url: `/agents/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'Agent', id }, { type: 'Agent', id: 'LIST' }],
    }),

    // Delete agent (soft delete, admin only)
    deleteAgent: builder.mutation<void, number>({
      query: (id) => ({ url: `/agents/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
    }),

    // Toggle agent availability (admin only)
    toggleAgentAvailability: builder.mutation<void, { agentId: number; isAvailable: boolean }>({
      query: ({ agentId, isAvailable }) => ({
        url: `/agents/${agentId}/availability`,
        method: 'PATCH',
        body: { is_available: isAvailable }
      }),
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

    // Get assigned agent (current user)
    getAssignedAgent: builder.query<Agent | null, void>({
      query: () => '/agents/assigned',
      providesTags: (res) =>
        res
          ? [
              { type: 'Agent' as const, id: res.id },
              { type: 'Agent' as const, id: 'ASSIGNED' },
            ]
          : [{ type: 'Agent' as const, id: 'ASSIGNED' }],
    }),

    // Assign agent to current user
    assignAgentToUser: builder.mutation<void, { agentId?: number }>({
      query: (params) => ({
        url: '/agents/assign',
        method: 'POST',
        params: params?.agentId ? { agent_id: params.agentId } : undefined
      }),
      invalidatesTags: [
        { type: 'Agent', id: 'LIST' },
        { type: 'Agent', id: 'ASSIGNED' },
        { type: 'Agent', id: 'PROFILE' },
        { type: 'User', id: 'PROFILE' },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Get available agents
    getAvailableAgents: builder.query<PaginatedResponse<Agent>, { specialization?: string; agentType?: string; cursor?: string | null; limit?: number }>({
      query: (params) => ({
        url: '/agents/available',
        params: { limit: 20, ...(params || {}) }
      }),
      providesTags: (result) => result?.items
        ? [...result.items.map((a) => ({type: 'Agent' as const, id: a.id})), {type: 'Agent' as const, id: 'LIST'}]
        : [{type: 'Agent' as const, id: 'LIST'}]
    }),

    // Get agent with stats
    getAgentStats: builder.query<AgentWithStats, number>({
      query: (id) => `/agents/${id}/stats`,
      providesTags: (_result, _error, arg) => [{type: 'Agent' as const, id: arg}]
    }),

    // Get visits handled by agent
    getAgentVisits: builder.query<PaginatedResponse<Visit>, { agentId: number; cursor?: string | null; limit?: number }>({
      query: ({ agentId, ...params }) => ({
        url: `/agents/${agentId}/visits`,
        params: { limit: 20, ...params }
      }),
      providesTags: [{type: 'Agent' as const, id: 'LIST'}, {type: 'Visit' as const, id: 'LIST'}]
    }),

    // Get agents by type
    getAgentsByType: builder.query<PaginatedResponse<Agent>, { agentType: string; cursor?: string | null; limit?: number }>({
      query: ({ agentType, ...params }) => ({
        url: `/agents/types/${agentType}`,
        params: { limit: 20, ...params }
      }),
      providesTags: (result) => result?.items
        ? [...result.items.map((a) => ({type: 'Agent' as const, id: a.id})), {type: 'Agent' as const, id: 'LIST'}]
        : [{type: 'Agent' as const, id: 'LIST'}]
    }),

    // Get agents by specialization
    getAgentsBySpecialization: builder.query<PaginatedResponse<Agent>, { specialization: string; cursor?: string | null; limit?: number }>({
      query: ({ specialization, ...params }) => ({
        url: `/agents/specializations/${specialization}`,
        params: { limit: 20, ...params }
      }),
      providesTags: (result) => result?.items
        ? [...result.items.map((a) => ({type: 'Agent' as const, id: a.id})), {type: 'Agent' as const, id: 'LIST'}]
        : [{type: 'Agent' as const, id: 'LIST'}]
    }),

  }),
})

export const {
  useListAgentsQuery,
  useGetAgentQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useToggleAgentAvailabilityMutation,
  useGetAgentProfileQuery,
  useGetAssignedAgentQuery,
  useAssignAgentToUserMutation,
  useGetAvailableAgentsQuery,
  useGetAgentStatsQuery,
  useGetAgentVisitsQuery,
  useGetAgentsByTypeQuery,
  useGetAgentsBySpecializationQuery,
} = agentsApi
