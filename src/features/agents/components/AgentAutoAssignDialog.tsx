import { useState } from 'react'
import { Scale } from 'lucide-react'
import type { Agent } from '@/types/api'
import { useAssignAgentMutation, useGetUsersQuery } from '@/features/users/api/usersApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { getErrorMessage } from '@/lib/errors'
import type { AgentWorkloadMap } from './AgentTable'

interface AgentAutoAssignDialogProps {
  target: Agent | null
  workloadByAgent: AgentWorkloadMap
}

export function AgentAutoAssignDialog({ target, workloadByAgent }: AgentAutoAssignDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  // The picker searches on the server: the first 100 unassigned users would hide the rest.
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const { currentData, isFetching, error, refetch } = useGetUsersQuery(
    { limit: 100, unassigned: true, q: debouncedSearch || undefined },
    { skip: !open },
  )
  const [assignAgent, { isLoading: assigning }] = useAssignAgentMutation()
  const assignableUsers = (currentData?.items ?? []).filter((user) => user.is_active)
  const targetWorkload = target ? workloadByAgent.get(target.id) : undefined
  const selectedUserIsAvailable = assignableUsers.some((user) => user.id === selectedUserId)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSelectedUserId(null)
      setSearch('')
    }
  }

  const handleAssign = async () => {
    if (!target || selectedUserId == null || !selectedUserIsAvailable || isFetching || error) return
    try {
      await assignAgent({ userId: selectedUserId, agentId: target.id }).unwrap()
      toast({ title: 'Assigned', description: `User #${selectedUserId} assigned to ${target.name} (least loaded active agent).` })
      handleOpenChange(false)
    } catch (cause: unknown) {
      toast({ title: 'Assignment failed', description: getErrorMessage(cause, 'Could not assign agent'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!target}>
          <Scale className="h-4 w-4" aria-hidden />Auto-Assign to Least Loaded
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-assign user</DialogTitle>
          <DialogDescription>Select an active user without an agent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Target agent: <span className="font-medium text-foreground">{target?.name}</span>
            {targetWorkload ? ` (${Math.round(targetWorkload.utilization)}% loaded)` : ''}
          </p>
          <div className="space-y-2">
            <Label htmlFor="auto-assign-user">Select a user without an agent</Label>
            <Input aria-label="Search users" placeholder="Search by name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={selectedUserId != null ? String(selectedUserId) : undefined} onValueChange={(value) => setSelectedUserId(Number(value))} disabled={isFetching || !!error || assignableUsers.length === 0}>
              <SelectTrigger id="auto-assign-user"><SelectValue placeholder="Choose user…" /></SelectTrigger>
              <SelectContent>
                {assignableUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.full_name || user.email || `User #${user.id}`}{user.phone ? ` (${user.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFetching && <p role="status" className="text-xs text-muted-foreground">Loading users…</p>}
            {!isFetching && error && (
              <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3 text-sm">
                <p>Could not load unassigned users: {getErrorMessage(error, 'Please try again.')}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
              </div>
            )}
            {!isFetching && !error && assignableUsers.length === 0 && <p className="text-xs text-muted-foreground">No unassigned active users found.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={assigning}>Cancel</Button>
          <Button onClick={() => void handleAssign()} disabled={!target || !selectedUserIsAvailable || isFetching || !!error || assigning}>
            {assigning ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
