import { useParams } from 'react-router-dom'
import { Users, TrendingUp, Shield, Phone } from 'lucide-react'
import UserList from '../components/UserList'
import UserDetail from '../components/UserDetail'
import { PageHeader } from '@/components/ui/page-header'
import { useUserRole } from '@/hooks/useUserRole'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { useGetSystemStatsQuery } from '@/features/core/api/systemApi'
import CountUp from '@/components/reactbits/CountUp'
import FadeContent from '@/components/reactbits/FadeContent'
import { formatNumber } from '@/lib/format'

const UsersPage = ({ mode }: { mode?: 'detail' }) => {
  const params = useParams()
  const { role } = useUserRole()

  // Exact counts via COUNT-style queries (limit=1 + include_total + filters).
  // The backend returns the precise total matching each filter, so no stat
  // card is derived from a bounded sample anymore. Skipped in detail mode,
  // where the stat row is not rendered.
  const skipStats = mode === 'detail'
  const { data: totalUsersData, isFetching: totalUsersFetching, isError: totalUsersError } = useGetUsersQuery({ limit: 1, include_total: true }, { skip: skipStats })
  const { data: activeUsersData, isFetching: activeUsersFetching, isError: activeUsersError } = useGetUsersQuery({ limit: 1, include_total: true, is_active: true }, { skip: skipStats })
  const { data: phoneVerifiedData, isFetching: phoneVerifiedFetching, isError: phoneVerifiedError } = useGetUsersQuery({ limit: 1, include_total: true, phone_verified: true }, { skip: skipStats })
  const { data: systemStats, isFetching: systemStatsFetching, isError: systemStatsError } = useGetSystemStatsQuery(undefined, {
    skip: role !== 'admin',
  })

  const totalUsers = totalUsersData?.total ?? 0
  const activeUsers = activeUsersData?.total ?? 0
  const phoneVerified = phoneVerifiedData?.total ?? 0

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

          {/* Exact counts — each card reads a server-computed total. */}
          <FadeContent container="#main-content" threshold={0} duration={600}>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  {totalUsersError ? (
                    <p className="text-2xl font-semibold tracking-tight">—</p>
                  ) : totalUsersFetching && !totalUsersData ? (
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
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  {activeUsersError ? (
                    <p className="text-2xl font-semibold tracking-tight">—</p>
                  ) : activeUsersFetching && !activeUsersData ? (
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
                  <p className="text-sm text-muted-foreground">Phone Verified</p>
                  {phoneVerifiedError ? (
                    <p className="text-2xl font-semibold tracking-tight">—</p>
                  ) : phoneVerifiedFetching && !phoneVerifiedData ? (
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
                    <p className="text-sm text-muted-foreground">Agents</p>
                    {systemStatsError ? (
                      <p className="text-2xl font-semibold tracking-tight">—</p>
                    ) : systemStatsFetching && !systemStats ? (
                      <p className="text-2xl font-semibold tracking-tight">…</p>
                    ) : (
                      <CountUp
                        to={systemStats?.total_agents ?? 0}
                        duration={1.1}
                        format={(n) => formatNumber(n)}
                        className="text-2xl font-semibold tracking-tight tabular-nums"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </FadeContent>
          {(totalUsersError || activeUsersError || phoneVerifiedError || systemStatsError) && (
            <p role="alert" className="text-xs text-muted-foreground">Could not load some counts. The user list may still work.</p>
          )}
        </div>

        {/* Users List */}
        <UserList />
      </div>
    </ErrorBoundary>
  )
}

export default UsersPage
