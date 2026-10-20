import { selectLeastLoadedAgent } from '../agentAssignment'
import type { Agent } from '@/types/api'

const agent = (id: number, is_active = true): Agent => ({
  id,
  name: `Agent ${id}`,
  agent_type: 'general',
  experience_level: 'expert',
  is_active,
  is_available: true,
  total_users_assigned: 0,
  user_satisfaction_rating: 0,
  created_at: '2026-01-01T00:00:00Z',
})

it('selects the least loaded visible active agent', () => {
  const agents = [agent(1), agent(2), agent(3, false)]
  const workloads = new Map([
    [1, { utilization: 60, currentUsers: 30 }],
    [2, { utilization: 20, currentUsers: 10 }],
  ])
  expect(selectLeastLoadedAgent(agents, workloads)?.id).toBe(2)
})

it('does not guess when a visible active agent has no workload record', () => {
  const agents = [agent(1), agent(2)]
  const workloads = new Map([[1, { utilization: 60, currentUsers: 30 }]])
  expect(selectLeastLoadedAgent(agents, workloads)).toBeNull()
})
