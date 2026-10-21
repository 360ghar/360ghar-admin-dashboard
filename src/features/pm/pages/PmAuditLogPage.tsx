import { useMemo, useState } from 'react'
import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import { Activity } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { ActivityRow } from '@/features/pm/components/ActivityRow'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
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
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { PageHeader } from '@/components/ui/page-header'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export default function PmAuditLogPage() {
  const { role } = useUserRole()
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId)
  const prefersReducedMotion = usePrefersReducedMotion()

  const ownerId = selectedOwnerId

  const pager = useCursorPagination(pmCursorKey(ownerId, 50))
  const activity = useGetPmDashboardActivityQuery(
    { owner_id: ownerId, limit: 50, cursor: pager.cursor },
    { skip: role === "agent" && !ownerId },
  )

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [entityId, setEntityId] = useState<string>('')

  const filtered = useMemo(() => {
    const rows = activity.currentData?.items ?? []
    return rows.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      // `at` is a UTC timestamp ending in Z, so its first ten characters are its UTC day. The day filters
      // compare days, as the report dates do (YYYY-MM-DD, both ends inclusive, UTC).
      const day = a.at.slice(0, 10)
      if (fromDate && day < fromDate) return false
      if (toDate && day > toDate) return false
      if (entityId.trim()) {
        const needle = entityId.trim()
        const matchesProp = a.property_id ? String(a.property_id) === needle : false
        const matchesLease = a.lease_id ? String(a.lease_id) === needle : false
        if (!matchesProp && !matchesLease) return false
      }
      return true
    })
  }, [activity.currentData, typeFilter, statusFilter, fromDate, toDate, entityId])

  const typeOptions = useMemo(() => {
    const set = new Set<string>()
    ;(activity.currentData?.items ?? []).forEach((a) => { if (a.type) set.add(a.type) })
    return Array.from(set).sort()
  }, [activity.currentData])

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    ;(activity.currentData?.items ?? []).forEach((a) => { if (a.status) set.add(a.status) })
    return Array.from(set).sort()
  }, [activity.currentData])

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
          <p className="text-xs text-muted-foreground">The filters apply to the rows of the page you are on. Days are UTC days.</p>
        </CardHeader>
        <CardContent>
          {activity.isError ? (
            <ErrorState
              title="Failed to load audit log"
              error={activity.error}
              onRetry={() => { void activity.refetch() }}
            />
          ) : (!activity.currentData && activity.isFetching) ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : filtered.length ? (
            <div className="space-y-2">
              {filtered.map((a, idx) => {
                const row = (
                  <ActivityRow
                    activity={a}
                    timestamp={formatDateTime(a.at)}
                    className="rounded-cohere-md px-2 py-2 transition-colors hover:bg-muted/40"
                    extra={
                      <>
                        {a.property_id ? <span className="text-muted-foreground"> • P#{a.property_id}</span> : null}
                        {a.lease_id ? <span className="text-muted-foreground"> • L#{a.lease_id}</span> : null}
                      </>
                    }
                  />
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
          {activity.currentData && (pager.canPrev || activity.currentData.has_more) ? (
            <CursorPager
              canPrev={pager.canPrev}
              hasMore={activity.currentData.has_more}
              loading={activity.isFetching}
              onPrev={pager.prev}
              onNext={() => pager.next(activity.currentData?.next_cursor)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
    </OwnerScopeGate>
  )
}
