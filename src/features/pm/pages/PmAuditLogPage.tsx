import { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { formatDateTime } from '@/lib/format'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { useDebounce } from '@/hooks/useDebounce'
import { selectSelectedOwnerId } from '@/features/pm/slices/pmSlice'
import { useGetPmDashboardActivityQuery } from '@/features/pm/api/pmApi'
import OwnerScopeGate from '@/features/pm/components/OwnerScopeGate'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export default function PmAuditLogPage() {
  const { role } = useUserRole()
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId)
  const prefersReducedMotion = usePrefersReducedMotion()

  const ownerId = useDebounce(selectedOwnerId, 300)

  const activity = useGetPmDashboardActivityQuery(
    { owner_id: ownerId, limit: 50 },
    { skip: role === "agent" && !ownerId },
  )

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [entityId, setEntityId] = useState<string>('')

  const filtered = useMemo(() => {
    const rows = activity.data?.items ?? []
    return rows.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (fromDate && new Date(a.at) < new Date(fromDate)) return false
      if (toDate && new Date(a.at) > new Date(`${toDate}T23:59:59`)) return false
      if (entityId.trim()) {
        const needle = entityId.trim()
        const matchesProp = a.property_id ? String(a.property_id) === needle : false
        const matchesLease = a.lease_id ? String(a.lease_id) === needle : false
        if (!matchesProp && !matchesLease) return false
      }
      return true
    })
  }, [activity.data, typeFilter, statusFilter, fromDate, toDate, entityId])

  const typeOptions = useMemo(() => {
    const set = new Set<string>()
    ;(activity.data?.items ?? []).forEach((a) => { if (a.type) set.add(a.type) })
    return Array.from(set).sort()
  }, [activity.data])

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    ;(activity.data?.items ?? []).forEach((a) => { if (a.status) set.add(a.status) })
    return Array.from(set).sort()
  }, [activity.data])

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || fromDate || toDate || entityId.trim()

  return (
    <OwnerScopeGate>
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Activity feed (payments, leases, maintenance) with filtering."
        icon={Activity}
        badge={`${filtered.length} events`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Action type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor="audit-from">From</Label>
              <Input id="audit-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor="audit-to">To</Label>
              <Input id="audit-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor="audit-entity">Property/Lease ID</Label>
              <Input id="audit-entity" placeholder="e.g. 42" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3">
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setFromDate(''); setToDate(''); setEntityId('') }}
              >
                Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.isError ? (
            <ErrorState
              title="Failed to load audit log"
              error={activity.error}
              onRetry={() => { void activity.refetch() }}
            />
          ) : activity.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : filtered.length ? (
            <div className="space-y-2">
              {filtered.map((a, idx) => {
                const row = (
                  <div className="flex items-center justify-between gap-4 rounded-cohere-md px-2 py-2 text-sm transition-colors hover:bg-muted/40">
                    <div className="min-w-0">
                      <span className="font-medium">{a.type}</span>
                      {a.status ? <span className="text-muted-foreground"> • {a.status}</span> : null}
                      {a.amount ? <span className="text-muted-foreground"> • {formatCurrency(a.amount)}</span> : null}
                      {a.property_id ? <span className="text-muted-foreground"> • P#{a.property_id}</span> : null}
                      {a.lease_id ? <span className="text-muted-foreground"> • L#{a.lease_id}</span> : null}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(a.at)}
                    </div>
                  </div>
                )
                return prefersReducedMotion ? (
                  <div key={`${a.type}-${a.at}-${idx}`}>{row}</div>
                ) : (
                  <FadeContent
                    key={`${a.type}-${a.at}-${idx}`}
                    container="#main-content"
                    threshold={0}
                    duration={500}
                    delay={idx > 8 ? 400 : idx * 50}
                  >
                    {row}
                  </FadeContent>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="h-12 w-12" />}
              title={hasActiveFilters ? 'No activity matches your filters' : 'No activity found'}
              description={hasActiveFilters ? 'Try adjusting or clearing the filters.' : undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
    </OwnerScopeGate>
  )
}
