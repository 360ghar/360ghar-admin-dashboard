import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useListAgentsQuery, useListAllAgentsQuery } from '@/features/agents/api/agentsApi'
import type { Agent } from '@/types/api'
import { useGetWorkloadQuery } from '@/features/core/api/systemApi'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { PAGE_SIZE_OPTIONS, usePageSizePreference } from '@/hooks/usePageSizePreference'
import { useScopedDebounce } from '@/hooks/useScopedDebounce'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { useUserRole } from '@/hooks/useUserRole'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { scopedStorageKey } from '@/lib/storage'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { selectLeastLoadedAgent } from '../lib/agentAssignment'
import { AgentAutoAssignDialog } from './AgentAutoAssignDialog'
import { AgentListFilters, type AgentStatus } from './AgentListFilters'
import { AgentTable, type AgentWorkloadMap } from './AgentTable'

const allowedFilterValues = { status: ['all', 'active', 'inactive'] }

const AgentList = () => {
  const { user } = useUserRole()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { filters, setFilters, clearFilters } = useFilterPersistence({
    key: 'agents',
    accountId: user?.supabase_user_id,
    defaultValue: { q: '', status: 'all' as AgentStatus },
    allowedValues: allowedFilterValues,
  })
  const { q, status } = filters
  const debouncedQuery = useScopedDebounce(q, user?.supabase_user_id, 300)
  const [pageSize, setPageSize] = usePageSizePreference({
    key: 'agents',
    accountId: user?.supabase_user_id,
    defaultSize: 20,
    sizes: PAGE_SIZE_OPTIONS,
  })

  // The API supports include_inactive, but search and status filtering run on the current page.
  const pager = useCursorPagination(JSON.stringify([user?.supabase_user_id, pageSize, status, debouncedQuery]))
  const includeInactive = status !== 'active'
  const { currentData, isFetching, isLoading, error, refetch } = useListAgentsQuery({
    include_inactive: includeInactive,
    cursor: pager.cursor,
    limit: pageSize,
  })
  const { data: workload, isFetching: workloadFetching, error: workloadError, refetch: refetchWorkload } = useGetWorkloadQuery()

  const workloadByAgent = useMemo<AgentWorkloadMap>(() => {
    const map: AgentWorkloadMap = new Map()
    const rows = Array.isArray(workload) ? workload : []
    rows.forEach((item) => {
      map.set(item.agent_id, { utilization: item.utilization_percentage, currentUsers: item.current_users })
    })
    return map
  }, [workload])

  const filteredResults = useMemo(() => {
    let agents = currentData?.items ?? []
    if (status === 'active') agents = agents.filter((agent) => agent.is_active)
    if (status === 'inactive') agents = agents.filter((agent) => !agent.is_active)
    if (!debouncedQuery) return agents
    const needle = debouncedQuery.toLowerCase()
    return agents.filter((agent) =>
      agent.name?.toLowerCase().includes(needle) ||
      agent.contact_number?.toLowerCase().includes(needle),
    )
  }, [currentData?.items, debouncedQuery, status])

  // Auto-assign picks the least loaded of every active agent (all pages of the agent list and of the
  // workload), not of the rows on this page or of a search result.
  const { data: activeAgents, isFetching: activeAgentsFetching, error: activeAgentsError, refetch: refetchActiveAgents } = useListAllAgentsQuery({ include_inactive: false })
  const targetsReady = activeAgents !== undefined && !activeAgentsFetching && !activeAgentsError && !workloadFetching && !workloadError
  const leastLoadedAgent = useMemo(
    () => targetsReady ? selectLeastLoadedAgent(activeAgents, workloadByAgent) : null,
    [targetsReady, activeAgents, workloadByAgent],
  )
  const hasActiveAgents = filteredResults.some((agent) => agent.is_active)
  const incompleteWorkload = targetsReady && activeAgents.length > 0 && !leastLoadedAgent

  const handleExport = () => {
    const rows = filteredResults.map((agent: Agent) => ({
      id: agent.id,
      name: agent.name,
      contact_number: agent.contact_number,
      is_active: agent.is_active,
      is_available: agent.is_available,
      total_users_assigned: agent.total_users_assigned,
      user_satisfaction_rating: agent.user_satisfaction_rating,
      agent_type: agent.agent_type,
      utilization_percentage: workloadByAgent.get(agent.id)?.utilization ?? '',
    }))
    downloadCsv(csvFilename('agents'), rows)
  }

  const pageControls = currentData && (
    <CursorPager
      canPrev={pager.canPrev}
      hasMore={currentData.has_more}
      nextCursor={currentData.next_cursor}
      loading={isFetching || isLoading}
      onPrev={pager.prev}
      onNext={() => pager.next(currentData.next_cursor)}
    />
  )

  return (
    <Card className="p-4 md:p-6">
      <AgentListFilters
        query={q}
        status={status}
        pageSize={pageSize}
        onQueryChange={(value) => setFilters({ q: value })}
        onStatusChange={(value) => setFilters({ status: value })}
        onPageSizeChange={setPageSize}
        onClear={clearFilters}
        onExport={handleExport}
        exportDisabled={isFetching || isLoading || !currentData}
      />
      <div className="mb-4 flex justify-end">
        <AgentAutoAssignDialog target={leastLoadedAgent} workloadByAgent={workloadByAgent} />
      </div>
      {hasActiveAgents && workloadError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm text-destructive">
          <span>Could not load agent workload. Auto-assign is unavailable.</span>
          <button type="button" className="underline" onClick={() => void refetchWorkload()}>Retry</button>
        </div>
      )}
      {hasActiveAgents && activeAgentsError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm text-destructive">
          <span>Could not load the active agents. Auto-assign is unavailable.</span>
          <button type="button" className="underline" onClick={() => void refetchActiveAgents()}>Retry</button>
        </div>
      )}
      {hasActiveAgents && workloadFetching && <p role="status" className="mb-4 text-right text-sm text-muted-foreground">Loading agent workload…</p>}
      {incompleteWorkload && <p role="status" className="mb-4 text-right text-sm text-muted-foreground">Workload is missing for some agents. Auto-assign is unavailable.</p>}
      {error && !currentData?.items.length ? (
        <ErrorState title="Failed to load agents" error={error} onRetry={() => { void refetch() }} />
      ) : isLoading || (isFetching && !currentData) ? (
        <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
      ) : filteredResults.length === 0 ? (
        <div className="space-y-4">
          {isFetching && <p role="status" className="text-sm text-muted-foreground">Updating agents…</p>}
          {error && <p role="alert" className="text-sm text-destructive">Refresh failed. Showing the last result for this page. <button type="button" className="underline" onClick={() => void refetch()}>Retry</button></p>}
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={q || status !== 'all' ? 'No agents match your filters' : 'No agents found'}
            description={
              q
                ? 'Search runs on the current page only — try clearing search or loading more pages.'
                : status !== 'all'
                  ? 'Try adjusting filters or checking other pages.'
                  : 'Get started by creating your first agent.'
            }
            action={{ label: 'Create Agent', onClick: () => void navigate('/agents/new') }}
          />
          {(pager.canPrev || currentData?.has_more) && pageControls}
        </div>
      ) : (
        <div className="space-y-4">
          {isFetching && <p role="status" className="text-sm text-muted-foreground">Updating agents…</p>}
          {error && <p role="alert" className="text-sm text-destructive">Refresh failed. Showing the last result for this page. <button type="button" className="underline" onClick={() => void refetch()}>Retry</button></p>}
          <AgentTable
            agents={filteredResults}
            workloadByAgent={workloadByAgent}
            viewStorageKey={user?.supabase_user_id ? scopedStorageKey('agents-table', user.supabase_user_id) : 'agents-table-anonymous'}
          />
          {pageControls}
        </div>
      )}
    </Card>
  )
}

export default AgentList
