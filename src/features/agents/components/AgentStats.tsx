import { useGetAgentQuery, useGetAgentStatsQuery } from '@/features/agents/api/agentsApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import CountUp from '@/components/reactbits/CountUp'

const Stat = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div className="rounded-cohere-md border border-cohere-card-border bg-card/50 p-3 backdrop-blur-md">
    <div className="text-xs text-muted-foreground">{label}</div>
    {typeof value === 'number' ? (
      <CountUp to={value} duration={1} className="text-lg font-semibold tabular-nums" />
    ) : (
      <div className="text-lg font-semibold">{String(value ?? '—')}</div>
    )}
  </div>
)

const AgentStats = ({ id }: { id: number }) => {
  const skip = !id || Number.isNaN(id)
  const { data: agentData, isLoading, error, refetch } = useGetAgentQuery(id, { skip })
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetAgentStatsQuery(id, { skip })

  if (skip) {
    return (
      <EmptyState
        title="Invalid agent id"
        description="The URL does not contain a valid agent identifier."
      />
    )
  }

  if (isLoading || statsLoading) return <LoadingState type="card" rows={4} />
  if (error || statsError) {
    return (
      <ErrorState
        title="Failed to load agent"
        error={error || statsError}
        onRetry={() => {
          void refetch()
          void refetchStats()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Agent Stats</h1>
      <Card>
        <CardHeader>
          <CardTitle>{agentData?.name || 'Agent'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Assigned Users" value={statsData?.stats?.total_users_assigned} />
            <Stat label="Active Conversations" value={statsData?.stats?.active_conversations} />
            <Stat label="Daily Interactions" value={statsData?.stats?.daily_interactions} />
            <Stat label="Efficiency" value={statsData?.stats?.efficiency_score} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AgentStats
