import { Link } from 'react-router-dom'
import { ArrowRight, Building2, IndianRupee, LayoutDashboard, Wrench } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { selectSelectedOwner } from '@/features/pm/slices/pmSlice'
import { useGetPmDashboardActivityQuery, useGetPmDashboardOverviewQuery } from '@/features/pm/api/pmApi'
import { formatCurrency } from '@/lib/format'
import { formatRelativeTime } from '@/lib/format'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PmDashboardPage() {
  const { role } = useUserRole()
  const selectedOwner = useAppSelector(selectSelectedOwner)

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managed Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{overview.data?.total_properties ?? 0}</div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Occupied: {overview.data?.occupied_properties ?? 0}</span>
              <span>•</span>
              <span>Vacant: {overview.data?.vacant_properties ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Rent</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(overview.data?.outstanding_rent_total ?? 0)}
              </div>
            )}
            <div className="mt-2">
              <Button asChild variant="link" className="h-auto p-0 text-xs">
                <Link to="/pm/rent-ledger">
                  Open rent ledger <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(overview.data?.monthly_revenue_current ?? 0)}
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Prev month: {formatCurrency(overview.data?.monthly_revenue_previous ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{overview.data?.under_maintenance_properties ?? 0}</div>
            )}
            <div className="mt-2">
              <Button asChild variant="link" className="h-auto p-0 text-xs">
                <Link to="/pm/maintenance">
                  Open maintenance <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      <Card>
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
              {activity.data.items.map((a, idx) => (
                <div key={`${a.type}-${a.at}-${idx}`} className="flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{a.type}</span>
                    {a.status ? <span className="text-muted-foreground"> • {a.status}</span> : null}
                    {a.amount ? <span className="text-muted-foreground"> • {formatCurrency(a.amount)}</span> : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(a.at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recent activity" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
