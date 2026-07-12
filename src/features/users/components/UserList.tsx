import { useEffect, useMemo, useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import type { UsersQuery } from '@/features/users/api/usersApi'
import type { User } from '@/types/api'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { useListAgentsQuery } from '@/features/agents/api/agentsApi'
import CursorPager from '@/components/ui/cursor-pager'
import { useDebounce } from '@/hooks/useDebounce'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import Combobox from '@/components/ui/combobox'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColumnDef } from '@tanstack/react-table'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { SortableHeader } from '@/components/ui/data-table'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { useIsMobile } from '@/hooks/useMediaQuery'

const UserList = () => {
  const { user: me, role } = useUserRole()
  const isMobile = useIsMobile()

  const { filters, setFilters } = useFilterPersistence({
    key: 'users',
    defaultValue: {
      q: '',
      agentId: '',
    },
  })

  const [q, setQ] = useState(filters.q || '')
  const [agentId, setAgentId] = useState<number | ''>(filters.agentId ? Number(filters.agentId) : '')

  useEffect(() => {
    setFilters({ q, agentId: agentId ? String(agentId) : '' })
  }, [q, agentId, setFilters])

  const dq = useDebounce(q)

  const [pageSize, setPageSize] = useState(10)
  // resetKey resets cursor during render when filters/limit change (avoids stale-cursor requests)
  const pager = useCursorPagination(`${dq}|${agentId}|${pageSize}`)

  const params = useMemo(() => {
    const base: UsersQuery = {}
    if (dq) base.q = dq
    if (role === 'agent' && me?.agent_id) base.agent_id = me.agent_id
    if (role === 'admin' && agentId) base.agent_id = agentId
    return base
  }, [dq, agentId, role, me?.agent_id])

  const { data, isFetching, isLoading, error, refetch } = useGetUsersQuery({ ...params, cursor: pager.cursor, limit: pageSize })
  const agents = useListAgentsQuery(
    { include_inactive: false },
    { skip: role !== 'admin' },
  )

  const activeFilterCount = (q ? 1 : 0) + (role === 'admin' && agentId ? 1 : 0)

  const clearFilters = () => {
    setQ('')
    setAgentId('')
  }

  const handleExport = () => {
    const rows = (data?.items ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      is_active: u.is_active,
      is_verified: u.is_verified,
      phone_verified: u.phone_verified,
      created_at: u.created_at,
    }))
    downloadCsv(csvFilename('users'), rows)
  }

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'full_name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => row.original.full_name ?? '-',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? '-',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email ?? '-',
    },
    {
      header: 'Assigned Agent',
      cell: ({ row }) =>
        row.original.agent?.name
        ?? row.original.agent?.user?.full_name
        ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/users/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ], [])

  const filterControls = (
    <>
      <FilterSection label="Search">
        <Input placeholder="Search name, phone, email" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterSection>
      {role === 'admin' && (
        <FilterSection label="Agent">
          <Combobox
            items={[{ value: '', label: 'All Agents' }, ...(agents.data?.items ?? []).map((a) => ({ value: a.id, label: a.name || `Agent #${a.id}` }))]}
            value={agentId}
            onChange={(v) => setAgentId(v !== '' ? Number(v) : '')}
            placeholder="Filter agents…"
          />
        </FilterSection>
      )}
      <FilterSection label="Rows per page">
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)) }}>
          <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
          </SelectContent>
        </Select>
      </FilterSection>
    </>
  )

  const renderCard = (user: User) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{user.full_name || `User #${user.id}`}</div>
          <div className="text-sm text-muted-foreground truncate">{user.phone || user.email || '—'}</div>
        </div>
        <Badge variant={user.is_active ? 'default' : 'secondary'} className="shrink-0">
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        Agent: {user.agent?.name ?? user.agent?.user?.full_name ?? '—'}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/users/${user.id}`}>View</Link>
        </Button>
      </div>
    </Card>
  )

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="hidden md:grid md:flex-1 gap-3 md:grid-cols-4">
          <Input placeholder="Search name, phone, email" value={q} onChange={(e) => setQ(e.target.value)} />
          {role === 'admin' && (
            <Combobox
              items={[{ value: '', label: 'All Agents' }, ...(agents.data?.items ?? []).map((a) => ({ value: a.id, label: a.name || `Agent #${a.id}` }))]}
              value={agentId}
              onChange={(v) => setAgentId(v !== '' ? Number(v) : '')}
              placeholder="Filter agents…"
            />
          )}
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)) }}>
            <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:hidden">
          <MobileFilters activeCount={activeFilterCount} onClear={clearFilters} title="User filters">
            {filterControls}
          </MobileFilters>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || isLoading} className="gap-2 ml-auto">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>
      {error ? (
        <ErrorState title="Failed to load users" error={error} onRetry={() => { void refetch() }} />
      ) : isLoading || (isFetching && !data) ? (
        <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
      ) : (!data?.items || data.items.length === 0) ? (
        <EmptyState
          title="No users found"
          description={q || agentId ? 'Try adjusting search or filters.' : 'Users will appear here once available.'}
          action={{ label: 'Refresh', onClick: () => { void refetch() }, variant: 'outline' }}
        />
      ) : (
        <div className="space-y-4">
          <ResponsiveDataTable
            columns={columns}
            data={data.items}
            enableSorting
            mobileCardRender={renderCard}
            viewStorageKey="users-table"
          />
          <CursorPager
            canPrev={pager.canPrev}
            hasMore={data.has_more ?? false}
            nextCursor={data.next_cursor}
            loading={isFetching}
            onPrev={pager.prev}
            onNext={() => pager.next(data.next_cursor)}
          />
        </div>
      )}
    </Card>
  )
}

export default UserList
