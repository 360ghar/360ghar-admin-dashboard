import { useParams, useSearchParams } from 'react-router-dom'
import BookingList from '../components/BookingList'
import BookingDetail from '../components/BookingDetail'
import BookingManagementPage from './BookingManagementPage'
import { CalendarCheck, CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { PageHeader } from '@/components/ui/page-header'
import { useGetAllBookingsQuery } from '../api/bookingsApi'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import FadeContent from '@/components/reactbits/FadeContent'

const StatCard = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: string }) => (
  <div className="flex items-center gap-3 rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
    <div className={`p-2 rounded-full ${tone}`}>{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  </div>
)

const BookingsPage = ({ mode }: { mode?: 'detail' }) => {
  const params = useParams()
  const { role } = useUserRole()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'manage' ? 'manage' : 'list'

  const { data, isFetching, isError } = useGetAllBookingsQuery(
    { limit: 1000, include_total: true },
    { skip: mode === 'detail' || view === 'manage' },
  )

  const counts = useMemo(() => {
    const items = data?.items ?? []
    const total = data?.total ?? items.length
    const upcoming = items.filter((b) => ['pending', 'confirmed'].includes(b.booking_status)).length
    const completed = items.filter((b) => b.booking_status === 'completed').length
    const cancelled = items.filter((b) => b.booking_status === 'cancelled').length
    return { total, upcoming, completed, cancelled }
  }, [data])

  if (mode === 'detail') return <BookingDetail id={Number(params.id)} />

  const setView = (next: 'list' | 'manage') => {
    if (next === 'list') {
      searchParams.delete('view')
      setSearchParams(searchParams, { replace: true })
    } else {
      setSearchParams({ view: 'manage' }, { replace: true })
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          title="Bookings"
          description={
            role === 'agent'
              ? 'Manage bookings for your assigned properties'
              : 'Oversee all bookings across the platform'
          }
          icon={CalendarCheck}
          badge={role === 'admin' ? 'Admin View' : 'Agent View'}
          actions={
            <div className="flex rounded-cohere-pill border border-cohere-card-border p-0.5 bg-card/40 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'rounded-cohere-pill px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView('manage')}
                className={cn(
                  'rounded-cohere-pill px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'manage' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Manage
              </button>
            </div>
          }
        />

        {view === 'list' && (
          <>
            <FadeContent container="#main-content" threshold={0} duration={600} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<CalendarCheck className="h-4 w-4 text-primary" />}
                label="Total (up to 1000)"
                value={isFetching ? '…' : counts.total}
                tone="bg-primary/10"
              />
              <StatCard
                icon={<CalendarClock className="h-4 w-4 text-cohere-action-blue" />}
                label="Upcoming (sample)"
                value={isFetching ? '…' : counts.upcoming}
                tone="bg-cohere-action-blue/10"
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4 text-cohere-deep-green" />}
                label="Completed (sample)"
                value={isFetching ? '…' : counts.completed}
                tone="bg-cohere-deep-green/15"
              />
              <StatCard
                icon={<XCircle className="h-4 w-4 text-destructive" />}
                label="Cancelled (sample)"
                value={isFetching ? '…' : counts.cancelled}
                tone="bg-destructive/10"
              />
            </FadeContent>
            <p className="text-xs text-muted-foreground">
              {isError
                ? 'Could not load booking stats. List below may still work.'
                : 'Status breakdowns from the most recent 1000 bookings (sample).'}
            </p>
          </>
        )}
      </div>

      {view === 'manage' ? <BookingManagementPage embedded /> : <BookingList />}
    </div>
  )
}

export default BookingsPage
