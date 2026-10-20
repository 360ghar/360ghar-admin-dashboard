import type { Agent } from '@/types/api'
import type { AgentWorkloadMap } from '../components/AgentTable'

/** A target is valid only when every visible active agent has a workload value. */
export function selectLeastLoadedAgent(agents: Agent[], workloadByAgent: AgentWorkloadMap): Agent | null {
  const active = agents.filter((agent) => agent.is_active)
  if (active.length === 0 || active.some((agent) => !workloadByAgent.has(agent.id))) return null
  return active.reduce((least, agent) =>
    workloadByAgent.get(agent.id)!.utilization < workloadByAgent.get(least.id)!.utilization ? agent : least,
  )
}
