import { useEffect, useMemo, useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useGetAllVisitsQuery } from '@/features/visits/api/visitsApi'
import type { VisitsQuery } from '@/features/visits/api/visitsApi'
import type { Visit } from '@/types/api'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { formatDateTime } from '@/lib/format'
import { useDebounce } from '@/hooks/useDebounce'
import { ColumnDef } from '@tanstack/react-table'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { SortableHeader } from '@/components/ui/data-table'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { getVisitStatusColor, getVisitStatusLabel } from '@/lib/statusColors'
import { useIsMobile } from '@/hooks/useMediaQuery'

const VisitList = () => {
  const { user: me, role } = useUserRole()
  const isMobile = useIsMobile()

  const { filters, setFilters } = useFilterPersistence({
    key: 'visits',
    defaultValue: {
      status: '',
      q: '',
    },
  })

  const [status, setStatus] = useState(filters.status || '')
  const [q, setQ] = useState(filters.q || '')

  useEffect(() => {
    setFilters({ status, q })
  }, [status, q, setFilters])

  const dq = useDebounce(q)

  const [pageSize, setPageSize] = useState(10)
  const pager = useCursorPagination(`${status}|${dq}|${pageSize}`)

  const params = useMemo(() => {
    const base: VisitsQuery & { q?: string } = {}
    if (status) base.status = status
    if (dq) base.q = dq
    if (role === 'agent' && me?.agent_id) base.agent_id = me.agent_id
    return base
  }, [status, dq, role, me?.agent_id])

  const { data, isFetching, isLoading, error, refetch } = useGetAllVisitsQuery({ ...params, cursor: pager.cursor, limit: pageSize })

  const activeFilterCount = (status ? 1 : 0) + (q ? 1 : 0)

  const clearFilters = () => {
    setStatus('')
    setQ('')
  }

  const handleExport = () => {
    const rows = (data?.items ?? []).map((v) => ({
      id: v.id,
      property_title: v.property?.title,
      user_name: v.user?.full_name,
      scheduled_date: v.scheduled_date,
      status: v.status,
      created_at: v.created_at,
    }))
    downloadCsv(csvFilename('visits'), rows)
  }

  const columns = useMemo<ColumnDef<Visit>[]>(() => [
    {
      accessorKey: 'property_id',
      header: ({ column }) => <SortableHeader column={column}>Property</SortableHeader>,
      cell: ({ row }) => row.original.property?.title ?? `#${row.original.property_id}`,
    },
    {
      accessorKey: 'user_id',
      header: ({ column }) => <SortableHeader column={column}>User</SortableHeader>,
      cell: ({ row }) => row.original.user?.full_name ?? `#${row.original.user_id}`,
    },
    {
      accessorKey: 'scheduled_date',
      header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
      cell: ({ row }) => row.original.scheduled_date ? formatDateTime(row.original.scheduled_date) : '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getVisitStatusColor(row.original.status)}>
          {row.original.status ? getVisitStatusLabel(row.original.status) : 'unknown'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/visits/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ], [])

  const renderCard = (visit: Visit) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">
            {visit.property?.title ?? `Property #${visit.property_id}`}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {visit.user?.full_name ?? `User #${visit.user_id}`}
          </div>
        </div>
        <Badge variant={getVisitStatusColor(visit.status)} className="shrink-0">
          {visit.status ? getVisitStatusLabel(visit.status) : 'unknown'}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        {visit.scheduled_date ? formatDateTime(visit.scheduled_date) : '—'}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/visits/${visit.id}`}>View</Link>
        </Button>
      </div>
    </Card>
  )

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-cohere-card-border/60 pb-4">
        <div className="hidden md:grid md:flex-1 gap-3 md:grid-cols-4">
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="reschedule_suggested">Reschedule suggested</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search property/user" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)) }}>
            <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:hidden">
          <MobileFilters activeCount={activeFilterCount} onClear={clearFilters} title="Visit filters">
            <FilterSection label="Status">
              <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="reschedule_suggested">Reschedule suggested</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>
            <FilterSection label="Search">
              <Input placeholder="Search property/user" value={q} onChange={(e) => setQ(e.target.value)} />
            </FilterSection>
            <FilterSection label="Rows">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)) }}>
                <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
                </SelectContent>
              </Select>
            </FilterSection>
          </MobileFilters>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || isLoading} className="gap-2 ml-auto">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>
      {error ? (
        <ErrorState title="Failed to load visits" error={error} onRetry={() => { void refetch() }} />
      ) : isLoading || (isFetching && !data) ? (
        <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
      ) : (!data?.items || data.items.length === 0) ? (
        <EmptyState
          title={q || status ? 'No results match your filters' : 'No visits found'}
          description={q || status ? 'Try adjusting search or filters.' : 'Visits will appear here once scheduled.'}
          action={{ label: 'Refresh', onClick: () => { void refetch() }, variant: 'outline' }}
        />
      ) : (
        <div className="space-y-4">
          <ResponsiveDataTable
            columns={columns}
            data={data.items}
            enableSorting
            mobileCardRender={renderCard}
            viewStorageKey="visits-table"
          />
          <CursorPager
            canPrev={pager.canPrev}
            hasMore={data.has_more ?? false}
            nextCursor={data.next_cursor}
            loading={isFetching || isLoading}
            onPrev={pager.prev}
            onNext={() => pager.next(data.next_cursor)}
          />
        </div>
      )}
    </Card>
  )
}

export default VisitList
