import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useGetSystemStatsQuery, useGetWorkloadQuery } from '@/features/core/api/systemApi'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { BarChart3, Home, Users } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/format'
import { StatCard } from '@/features/core/components/dashboard/StatCard'
import { TOOLTIP_STYLE } from '@/features/core/components/dashboard/DashboardCharts'

const WORKLOAD_COLOR = 'hsl(218 77% 62%)'

const AnalyticsPage = () => {
  const stats = useGetSystemStatsQuery()
  const workload = useGetWorkloadQuery()
  const s = stats.data ?? { active_agents: 0, active_users: 0, properties_listed: 0, occupancy_rate: 0 }
  const workloadData = workload.data?.map((w) => ({
    name: w.agent_name,
    value: w.current_users,
  })) ?? []
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Analytics"
        description="Platform KPIs and agent workload distribution"
        icon={BarChart3}
      />
      <Card>
        <CardHeader>
          <CardTitle>KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.isError ? (
            <ErrorState title="Could not load KPIs" onRetry={() => void stats.refetch()} />
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatCard title="Active Agents" value={s.active_agents} formatValue={(n) => formatNumber(n)} icon={Home} isLoading={stats.isLoading} />
            <StatCard title="Active Users" value={s.active_users} formatValue={(n) => formatNumber(n)} icon={Users} isLoading={stats.isLoading} />
            <StatCard title="Properties Listed" value={s.properties_listed} formatValue={(n) => formatNumber(n)} icon={Home} isLoading={stats.isLoading} />
            <StatCard title="Occupancy Rate" value={s.occupancy_rate} formatValue={(n) => formatPercent(n)} icon={Home} isLoading={stats.isLoading} />
          </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Agent Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {workload.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : workload.isError ? (
            <ErrorState title="Failed to load analytics" onRetry={() => void workload.refetch()} />
          ) : workloadData.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No workload data"
              description="Agent workload will appear once agents have assigned users."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 8% 20%)" vertical={false} />
                  <XAxis dataKey="name" hide={false} interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 12, fill: 'hsl(240 8% 62%)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(240 8% 62%)' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: 'hsl(240 8% 62%)' }} />
                  <Bar dataKey="value" fill={WORKLOAD_COLOR} name="Workload" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsPage
