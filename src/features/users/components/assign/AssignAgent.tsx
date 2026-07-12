import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Combobox from '@/components/ui/combobox'
import { useListAgentsQuery } from '@/features/agents/api/agentsApi'
import { useAssignAgentMutation } from '@/features/users/api/usersApi'
import { getErrorMessage } from '@/lib/errors'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

interface AssignAgentProps {
  userId: number
  currentAgentId?: number | null
  currentAgentLabel?: string | null
}

const AssignAgent = ({ userId, currentAgentId, currentAgentLabel }: AssignAgentProps) => {
  const [agentId, setAgentId] = useState<number | ''>(currentAgentId ?? '')
  const agents = useListAgentsQuery({ include_inactive: false, limit: 100 })
  const { toast } = useToast()
  const [assignAgent, { isLoading }] = useAssignAgentMutation()

  useEffect(() => {
    if (currentAgentId != null) {
      setAgentId(currentAgentId)
    }
  }, [currentAgentId])

  const assign = async () => {
    if (!agentId) {
      toast({ title: 'Select an agent', description: 'Choose an agent before assigning.', variant: 'destructive' })
      return
    }
    try {
      await assignAgent({ userId, agentId: Number(agentId) }).unwrap()
      toast({ title: 'Assigned', description: 'Agent assigned successfully' })
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Please try again'), variant: 'destructive' })
    }
  }

  if (agents.error) {
    return (
      <ErrorState
        title="Failed to load agents"
        error={agents.error}
        onRetry={() => { void agents.refetch() }}
      />
    )
  }

  if (agents.isLoading) {
    return <LoadingState type="skeleton" rows={2} />
  }

  const items = (agents.data?.items ?? []).map((a) => ({
    value: a.id,
    label: a.name || `Agent #${a.id}`,
  }))

  return (
    <div className="space-y-3">
      {currentAgentLabel && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Currently assigned:</span>
          <Badge variant="secondary">{currentAgentLabel}</Badge>
        </div>
      )}
      {!currentAgentLabel && currentAgentId == null && (
        <p className="text-sm text-muted-foreground">No agent assigned yet.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <div className="w-64 min-w-[12rem] flex-1">
          <Combobox
            items={items}
            value={agentId}
            onChange={(v) => setAgentId(v !== '' ? Number(v) : '')}
            placeholder="Search agent…"
            emptyText="No active agents found"
          />
        </div>
        <Button
          onClick={() => { void assign() }}
          disabled={!agentId || isLoading || (currentAgentId != null && Number(agentId) === currentAgentId)}
        >
          {isLoading ? 'Assigning…' : currentAgentId ? 'Reassign' : 'Assign'}
        </Button>
      </div>
    </div>
  )
}

export default AssignAgent
