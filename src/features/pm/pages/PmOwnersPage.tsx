import {useMemo, useState} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { UserRound, Users } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useDebounce } from '@/hooks/useDebounce'
import { useAppDispatch } from '@/hooks/redux'
import { setSelectedOwner } from '@/features/pm/slices/pmSlice'
import { useOwnersSearch } from '@/features/pm/hooks/useOwnersSearch'
import AssignAgent from '@/features/users/components/assign/AssignAgent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Input } from '@/components/ui/input'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { User } from '@/types'
import { getOwnerLabel, getKycStatus } from '@/features/pm/utils'
import { PageHeader } from '@/components/ui/page-header'

export default function PmOwnersPage() {
  const { role } = useUserRole()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)
  const pager = useCursorPagination(`${debouncedQ}`)

  const users = useOwnersSearch(debouncedQ, { cursor: pager.cursor })

  const owners = useMemo(() => (users.data?.items || []).filter((u) => u.role === 'user'), [users.data?.items])

  const columns = useMemo<ColumnDef<User>[]>(() => {
    return [
      {
        accessorKey: 'full_name',
        header: 'Owner',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{getOwnerLabel(row.original)}</div>
              <div className="truncate text-xs text-muted-foreground">ID: {row.original.id}</div>
            </div>
          </div>
        )},
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => <span className="text-sm">{row.original.phone || '—'}</span>},
      {
        accessorKey: 'agent_id',
        header: 'Assigned RM',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.agent_id ? `Agent #${row.original.agent_id}` : 'Unassigned'}
          </span>
        )},
      {
        id: 'kyc',
        header: 'KYC',
        cell: ({ row }) => {
          const status = getKycStatus(row.original)
          const variant = status === 'verified' ? 'default' : status === 'pending' ? 'secondary' : 'outline'
          return <Badge variant={variant}>{status}</Badge>
        }},
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/pm/owners/${row.original.id}`}>View</Link>
            </Button>
            {role === 'agent' ? (
              <Button
                size="sm"
                onClick={() => {
                  dispatch(setSelectedOwner({ id: row.original.id, label: getOwnerLabel(row.original) }))
                  navigate('/pm/properties')
                }}
              >
                Select
              </Button>
            ) : role === 'admin' ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">Assign RM</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Assign Relationship Manager</DialogTitle>
                  </DialogHeader>
                  <AssignAgent userId={row.original.id} />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        )},
    ]
  }, [dispatch, navigate, role])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owners"
        description={role === 'admin' ? 'All owner portfolios.' : 'Owners assigned to you.'}
        icon={Users}
        actions={
          <Badge variant="secondary" className="h-fit">
            {owners.length} shown
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="max-w-md">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name / phone / email…"
              />
            </div>
          </div>

          {users.isError ? (
            <ErrorState
              title="Failed to load owners"
              error={users.error}
              onRetry={() => { void users.refetch() }}
            />
          ) : users.isLoading ? (
            <LoadingState type="spinner" />
          ) : owners.length ? (
            <>
              <ResponsiveDataTable columns={columns} data={owners} />
              <CursorPager
                canPrev={pager.canPrev}
                hasMore={users.data?.has_more ?? false}
                loading={users.isFetching}
                onPrev={pager.prev}
                onNext={() => users.data && pager.next(users.data.next_cursor)}
              />
            </>
          ) : (
            <EmptyState
              title="No owners found"
              description="Try adjusting your search."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
