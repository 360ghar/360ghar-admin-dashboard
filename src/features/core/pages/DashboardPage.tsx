import { LayoutDashboard } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { PageHeader } from '@/components/ui/page-header'
import { AdminKpis, AgentKpis } from '@/features/core/components/dashboard/DashboardKpis'
import { BusinessMetrics } from '@/features/core/components/dashboard/BusinessMetrics'
import { ActivityTrendCard, PropertyStatusCard } from '@/features/core/components/dashboard/DashboardCharts'
import { RecentActivityCard } from '@/features/core/components/dashboard/RecentActivityCard'
import { QuickActions } from '@/features/core/components/dashboard/QuickActions'
import { useDashboardData } from '@/features/core/hooks/useDashboardData'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { AmbientBackground } from '@/components/reactbits/ambient-background'

const DashboardPage = () => {
  const { user, role } = useUserRole()
  const { trend, feed, metrics, statusBreakdown, isLoading, isError, isMetricsLoading, isMetricsError, refetch } =
    useDashboardData()

  return (
    <ErrorBoundary>
    <div className="space-y-8">
      {/* Ambient hero band — the only surface where animated backgrounds run */}
      <div className="relative overflow-hidden rounded-cohere-lg border border-cohere-card-border">
        <div className="absolute inset-0">
          <AmbientBackground variant="aurora" className="opacity-40" />
        </div>
        <div className="relative bg-gradient-to-b from-background/60 via-background/25 to-transparent p-6 md:p-8">
          <PageHeader
            title={role === 'agent' ? 'Agent Dashboard' : 'Admin Dashboard'}
            description={
              <>
                Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Here&apos;s what&apos;s happening with your{' '}
                {role === 'agent' ? 'assigned portfolio' : 'platform'}.
              </>
            }
            icon={LayoutDashboard}
          />
        </div>
      </div>

      {role === 'agent' ? <AgentKpis agentId={user?.agent_id} /> : <AdminKpis />}

      {role !== 'agent' && (
        <BusinessMetrics metrics={metrics} isLoading={isMetricsLoading} isError={isMetricsError} onRetry={refetch} />
      )}

      <QuickActions role={role} />

      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityTrendCard
          className="lg:col-span-2"
          trend={trend}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
        <PropertyStatusCard
          data={statusBreakdown.data}
          total={statusBreakdown.total}
          isLoading={statusBreakdown.isLoading}
          isError={statusBreakdown.isError}
          onRetry={statusBreakdown.refetch}
        />
      </div>

      <RecentActivityCard feed={feed} isLoading={isLoading} isError={isError} onRetry={refetch} />
    </div>
    </ErrorBoundary>
  )
}

export default DashboardPage
