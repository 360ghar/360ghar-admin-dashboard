import { useUserRole } from '@/hooks/useUserRole'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { AdminKpis, AgentKpis } from '@/features/core/components/dashboard/DashboardKpis'
import { BusinessMetrics } from '@/features/core/components/dashboard/BusinessMetrics'
import { ActivityTrendCard, PropertyStatusCard } from '@/features/core/components/dashboard/DashboardCharts'
import { RecentActivityCard } from '@/features/core/components/dashboard/RecentActivityCard'
import { QuickActions } from '@/features/core/components/dashboard/QuickActions'
import { useDashboardData } from '@/features/core/hooks/useDashboardData'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import SplitText from '@/components/reactbits/SplitText'

const DashboardPage = () => {
  const { user, role } = useUserRole()
  const pageTitle = role === 'agent' ? 'Agent Dashboard' : 'Admin Dashboard'
  useDocumentTitle(pageTitle)
  const prefersReducedMotion = usePrefersReducedMotion()
  const { trend, feed, metrics, statusBreakdown, isLoading, isError, isMetricsLoading, isMetricsError, refetch } =
    useDashboardData()

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Compact header — title and quick actions on one row so the KPIs start above the fold */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {prefersReducedMotion ? (
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{pageTitle}</h1>
          ) : (
            <SplitText
              text={pageTitle}
              tag="h1"
              splitType="words, chars"
              delay={14}
              duration={0.8}
              threshold={0}
              rootMargin="0px"
              className="text-2xl font-semibold tracking-tight md:text-3xl"
            />
          )}
          <QuickActions role={role} />
        </div>

        {role === 'agent' ? <AgentKpis agentId={user?.agent_id} /> : <AdminKpis />}

        {role !== 'agent' && (
          <BusinessMetrics metrics={metrics} isLoading={isMetricsLoading} isError={isMetricsError} onRetry={refetch} />
        )}

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
