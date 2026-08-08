import { Users, Building2, TrendingUp, UserCog, MessageSquare, Activity, Star } from 'lucide-react'
import { useGetSystemStatsQuery } from '@/features/core/api/systemApi'
import { useGetAgentStatsQuery } from '@/features/agents/api/agentsApi'
import { formatNumber, formatPercent } from '@/lib/format'
import { ErrorState } from '@/components/ui/error-state'
import { StatCard } from './StatCard'

export function AdminKpis() {
  const { data, isLoading, isError, refetch } = useGetSystemStatsQuery()

  if (isError) {
    return <ErrorState title="Couldn't load platform stats" onRetry={() => void refetch()} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Agents"
        value={data?.active_agents}
        icon={UserCog}
        hint={data?.total_agents !== undefined ? `of ${formatNumber(data.total_agents)} total` : undefined}
        isLoading={isLoading}
        to="/agents"
      />
      <StatCard
        title="Active Users"
        value={data?.active_users}
        icon={Users}
        isLoading={isLoading}
        to="/users"
      />
      <StatCard
        title="Properties Listed"
        value={data?.properties_listed}
        icon={Building2}
        isLoading={isLoading}
        to="/properties"
      />
      <StatCard
        title="Occupancy Rate"
        value={data?.occupancy_rate}
        formatValue={(n) => formatPercent(n)}
        icon={TrendingUp}
        isLoading={isLoading}
      />
    </div>
  )
}

export function AgentKpis({ agentId }: { agentId?: number | null }) {
  const { data, isLoading, isError, refetch } = useGetAgentStatsQuery(agentId ?? 0, { skip: !agentId })
  const stats = data?.stats
  // Server may send the rating as a number or a numeric string; normalize once
  // and fall back to the card's '—' placeholder when it's not a finite value.
  const rating = Number(stats?.user_satisfaction_rating)

  if (isError) {
    return <ErrorState title="Couldn't load your stats" onRetry={() => void refetch()} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Assigned Users"
        value={stats?.total_users_assigned}
        icon={Users}
        isLoading={isLoading}
        to="/users"
      />
      <StatCard
        title="Satisfaction"
        value={Number.isFinite(rating) ? rating : undefined}
        formatValue={(n) => `${n.toFixed(1)}/5`}
        icon={Star}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Conversations"
        value={stats?.active_conversations}
        icon={MessageSquare}
        isLoading={isLoading}
      />
      <StatCard
        title="Weekly Interactions"
        value={stats?.weekly_interactions}
        icon={Activity}
        isLoading={isLoading}
      />
    </div>
  )
}
