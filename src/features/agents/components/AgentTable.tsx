import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { BarChart3, Edit } from 'lucide-react'
import type { Agent } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SortableHeader } from '@/components/ui/data-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { cn } from '@/lib/utils'
import { AgentRowActions } from './AgentRowActions'

export type AgentWorkload = { utilization: number; currentUsers: number }
export type AgentWorkloadMap = Map<number, AgentWorkload>

function workloadTone(utilization: number): string {
  return utilization > 80
    ? 'text-red-600 dark:text-red-400'
    : utilization > 60
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-green-600 dark:text-green-400'
}

interface AgentTableProps {
  agents: Agent[]
  workloadByAgent: AgentWorkloadMap
  viewStorageKey: string
}

export function AgentTable({ agents, workloadByAgent, viewStorageKey }: AgentTableProps) {
  const columns = useMemo<ColumnDef<Agent>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => row.original.name ?? '—',
    },
    {
      accessorKey: 'contact_number',
      header: 'Contact',
      cell: ({ row }) => row.original.contact_number ?? '—',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.getValue('is_active')
        return <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Active' : 'Inactive'}</Badge>
      },
    },
    {
      accessorKey: 'total_users_assigned',
      header: ({ column }) => <SortableHeader column={column}>Users Assigned</SortableHeader>,
      cell: ({ row }) => row.original.total_users_assigned ?? 0,
    },
    {
      accessorKey: 'user_satisfaction_rating',
      header: ({ column }) => <SortableHeader column={column}>Satisfaction</SortableHeader>,
      cell: ({ row }) => row.original.user_satisfaction_rating ?? '—',
    },
    {
      id: 'workload',
      header: 'Workload',
      cell: ({ row }) => {
        const workload = workloadByAgent.get(row.original.id)
        if (!workload) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-col">
            <span className={cn('font-medium', workloadTone(workload.utilization))}>{Math.round(workload.utilization)}%</span>
            <span className="text-xs text-muted-foreground">{workload.currentUsers} users</span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
        <AgentRowActions agent={row.original} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Actions</Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild><Link to={`/agents/${row.original.id}`}><Edit className="mr-2 h-4 w-4" aria-hidden />Edit</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to={`/agents/${row.original.id}/stats`}><BarChart3 className="mr-2 h-4 w-4" aria-hidden />Stats</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      ),
    },
  ], [workloadByAgent])

  const renderCard = (agent: Agent) => {
    const workload = workloadByAgent.get(agent.id)
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{agent.name ?? `Agent #${agent.id}`}</div>
            <div className="truncate text-sm text-muted-foreground">{agent.contact_number ?? '—'}</div>
          </div>
          <Badge variant={agent.is_active ? 'default' : 'secondary'} className="shrink-0">{agent.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{agent.total_users_assigned ?? 0} users assigned</span>
          {workload ? <span className={cn('font-medium', workloadTone(workload.utilization))}>{Math.round(workload.utilization)}% workload</span> : <span className="text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AgentRowActions agent={agent} />
          <Button variant="outline" size="sm" asChild><Link to={`/agents/${agent.id}`}><Edit className="mr-1 h-4 w-4" aria-hidden />Edit</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to={`/agents/${agent.id}/stats`}><BarChart3 className="mr-1 h-4 w-4" aria-hidden />Stats</Link></Button>
        </div>
      </Card>
    )
  }

  return <ResponsiveDataTable columns={columns} data={agents} enableSorting enableColumnVisibility mobileCardRender={renderCard} viewStorageKey={viewStorageKey} />
}
