import { Link } from 'react-router-dom'
import { Building2, IndianRupee, LayoutDashboard, Wrench } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { selectSelectedOwner } from '@/features/pm/slices/pmSlice'
import { useGetPmDashboardActivityQuery, useGetPmDashboardOverviewQuery } from '@/features/pm/api/pmApi'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { ActivityRow } from '@/features/pm/components/ActivityRow'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/features/core/components/dashboard/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import FadeContent from '@/components/reactbits/FadeContent'

export default function PmDashboardPage() {
  const { role } = useUserRole()
  const selectedOwner = useAppSelector(selectSelectedOwner)
  const prefersReducedMotion = usePrefersReducedMotion()

  const ownerId = selectedOwner?.id ?? null

  const overview = useGetPmDashboardOverviewQuery({ owner_id: ownerId })
  const activity = useGetPmDashboardActivityQuery({ owner_id: ownerId, limit: 20 })

  const scopeLabel =
    selectedOwner ? selectedOwner.label : role === 'admin' ? 'All portfolios' : 'All assigned owners'

  return (
    <div className="space-y-6">
      <PageHeader
        title="PM Dashboard"
        description={
          <>
            Operational overview for <span className="font-medium text-foreground">{scopeLabel}</span>.
          </>
        }
        icon={LayoutDashboard}
        badge={role === 'admin' ? 'Admin' : 'Agent'}
      />

      {overview.isError ? (
        <ErrorState
          error={overview.error}
          onRetry={() => void overview.refetch()}
        />
      ) : null}

      {!overview.isError ? (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Managed Properties"
          value={overview.data?.total_properties}
          icon={Building2}
          hint={overview.data ? `Occupied: ${overview.data.occupied_properties} • Vacant: ${overview.data.vacant_properties}` : undefined}
          isLoading={overview.isLoading}
        />
        <StatCard
          title="Outstanding Rent"
          value={overview.data?.outstanding_rent_total}
          formatValue={(n) => formatCurrency(n)}
          icon={IndianRupee}
          isLoading={overview.isLoading}
          to="/pm/rent-ledger"
        />
        <StatCard
          title="Monthly Revenue"
          value={overview.data?.monthly_revenue_current}
          formatValue={(n) => formatCurrency(n)}
          icon={IndianRupee}
          hint={overview.data ? `Prev month: ${formatCurrency(overview.data.monthly_revenue_previous)}` : undefined}
          isLoading={overview.isLoading}
        />
        <StatCard
          title="Open Maintenance"
          value={overview.data?.under_maintenance_properties}
          icon={Wrench}
          isLoading={overview.isLoading}
          to="/pm/maintenance"
        />
      </div>
      ) : null}

      <Card className="card-glow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          {role === 'admin' ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/pm/audit">View audit</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {activity.isError ? (
            <ErrorState
              error={activity.error}
              onRetry={() => void activity.refetch()}
            />
          ) : activity.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : activity.data?.items?.length ? (
            <div className="space-y-2">
              {activity.data.items.map((a, idx) => {
                const row = (
                  <ActivityRow
                    activity={a}
                    timestamp={formatRelativeTime(a.at)}
                    className="rounded-cohere-md px-2 py-2 transition-colors hover:bg-muted/40"
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
                    delay={idx > 6 ? 0 : idx * 60}
                  >
                    {row}
                  </FadeContent>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No recent activity" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
