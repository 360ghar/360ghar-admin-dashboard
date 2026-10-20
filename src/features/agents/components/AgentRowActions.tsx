import { Trash2 } from 'lucide-react'
import type { Agent } from '@/types/api'
import { useDeleteAgentMutation, useToggleAgentAvailabilityMutation } from '@/features/agents/api/agentsApi'
import { Button } from '@/components/ui/button'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

/** Availability toggle and delete for one agent row. A component, so request state does not rebuild the table columns. */
export function AgentRowActions({ agent }: { agent: Agent }) {
  const { toast } = useToast()
  const [toggle, toggleState] = useToggleAgentAvailabilityMutation()
  const [remove, removeState] = useDeleteAgentMutation()
  const next = !agent.is_available
  const name = agent.name ?? `Agent #${agent.id}`

  const onToggle = async () => {
    try {
      await toggle({ agentId: agent.id, isAvailable: next }).unwrap()
      toast({ title: 'Updated', description: `${name} is now ${next ? 'available' : 'unavailable'}.` })
    } catch (cause: unknown) {
      toast({ title: 'Update failed', description: getErrorMessage(cause, 'Could not change availability'), variant: 'destructive' })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => void onToggle()} disabled={toggleState.isLoading}>
        {next ? 'Set available' : 'Set unavailable'}
      </Button>
      <ConfirmAlertDialog
        title="Delete Agent"
        description={`Are you sure you want to delete ${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          await remove(agent.id).unwrap()
          toast({ title: 'Deleted', description: `${name} deleted.` })
        }}
      >
        {(openDialog) => (
          <Button variant="destructive" size="sm" onClick={openDialog} disabled={removeState.isLoading} aria-label={`Delete ${name}`}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </ConfirmAlertDialog>
    </div>
  )
}
