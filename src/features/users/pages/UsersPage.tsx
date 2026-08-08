import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Users, TrendingUp, Shield, Phone } from 'lucide-react'
import UserList from '../components/UserList'
import UserDetail from '../components/UserDetail'
import { PageHeader } from '@/components/ui/page-header'
import { useUserRole } from '@/hooks/useUserRole'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { useListAgentsQuery } from '@/features/agents/api/agentsApi'
import { useGetSystemStatsQuery } from '@/features/core/api/systemApi'
import CountUp from '@/components/reactbits/CountUp'
import FadeContent from '@/components/reactbits/FadeContent'
import { formatNumber } from '@/lib/format'

const UsersPage = ({ mode }: { mode?: 'detail' }) => {
  const params = useParams()
  const { role } = useUserRole()

  // Cursor-paginated endpoints no longer expose a `total` field, so the Total
  // Users / Agents stat cards are derived from a bounded sample (limit=100).
  // Active / Phone Verified counts are derived client-side from the same sample
  // unless the admin system-stats endpoint exposes them directly.
  const { data: usersSample, isFetching: usersFetching } = useGetUsersQuery({ limit: 100 })
  const { data: systemStats } = useGetSystemStatsQuery(undefined, { skip: role !== 'admin' })
  const { data: agentsData } = useListAgentsQuery(
    { include_inactive: false, limit: 100 },
    { skip: role !== 'admin' }
  )

  const totalUsers = usersSample?.items?.length ?? 0
  const activeUsers = useMemo(() => {
    if (role === 'admin' && typeof systemStats?.active_users === 'number') {
      return systemStats.active_users
    }
    return usersSample?.items?.filter((u) => u.is_active).length ?? 0
  }, [role, systemStats, usersSample])

  const phoneVerified = useMemo(() => {
    return usersSample?.items?.filter((u) => u.phone_verified).length ?? 0
  }, [usersSample])

  const totalAgents = agentsData?.items?.length ?? 0

  if (mode === 'detail') {
    const id = Number(params.id)
    return <UserDetail id={id} />
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="space-y-4">
          <PageHeader
            title="Users"
            description={
              role === 'agent'
                ? 'Manage users assigned to you and track their interactions'
                : 'Manage all users in the system and oversee user accounts'
            }
            icon={Users}
            badge={role === 'admin' ? 'Admin View' : 'Agent View'}
          />

          {/* Sample-bounded stats (cursor API has no total) — labels reflect that. */}
          <FadeContent container="#main-content" threshold={0} duration={600}>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Users (up to 100)</p>
                  {usersFetching ? (
                    <p className="text-2xl font-semibold tracking-tight">…</p>
                  ) : (
                    <CountUp
                      to={totalUsers}
                      duration={1.1}
                      format={(n) => formatNumber(n)}
                      className="text-2xl font-semibold tracking-tight tabular-nums"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                <div className="p-2 bg-cohere-coral/10 rounded-full">
                  <TrendingUp className="h-4 w-4 text-cohere-coral" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {role === 'admin' && typeof systemStats?.active_users === 'number'
                      ? 'Active Users'
                      : 'Active Users (sample)'}
                  </p>
                  {usersFetching ? (
                    <p className="text-2xl font-semibold tracking-tight">…</p>
                  ) : (
                    <CountUp
                      to={activeUsers}
                      duration={1.1}
                      format={(n) => formatNumber(n)}
                      className="text-2xl font-semibold tracking-tight tabular-nums"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                <div className="p-2 bg-cohere-action-blue/10 rounded-full">
                  <Phone className="h-4 w-4 text-cohere-action-blue" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Phone Verified (sample)</p>
                  {usersFetching ? (
                    <p className="text-2xl font-semibold tracking-tight">…</p>
                  ) : (
                    <CountUp
                      to={phoneVerified}
                      duration={1.1}
                      format={(n) => formatNumber(n)}
                      className="text-2xl font-semibold tracking-tight tabular-nums"
                    />
                  )}
                </div>
              </div>

              {role === 'admin' && (
                <div className="flex items-center gap-3 p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                  <div className="p-2 bg-secondary rounded-full">
                    <Shield className="h-4 w-4 text-foreground/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Agents (up to 100)</p>
                    <CountUp
                      to={totalAgents}
                      duration={1.1}
                      format={(n) => formatNumber(n)}
                      className="text-2xl font-semibold tracking-tight tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>
          </FadeContent>
        </div>

        {/* Users List */}
        <UserList />
      </div>
    </ErrorBoundary>
  )
}

export default UsersPage
