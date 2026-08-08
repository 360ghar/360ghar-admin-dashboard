import {useState} from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  useGetUserVisitsQuery,
  useRescheduleVisitMutation,
  useCancelVisitMutation,
  useGetAllVisitsQuery
} from '@/features/visits/api/visitsApi'
import { Calendar as CalendarIcon, Clock, Check, Plus, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { Visit } from '@/types/api'
import { getErrorMessage } from '@/lib/errors'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import { VisitCalendar } from '@/features/visits/components/VisitCalendar'
import { VisitFilters } from '@/features/visits/components/VisitFilters'
import { VisitCard } from '@/features/visits/components/VisitCard'
import { ScheduleVisitDialog } from '@/features/visits/components/ScheduleVisitDialog'
import { CompleteVisitDialog } from '@/features/visits/components/CompleteVisitDialog'
import FadeContent from '@/components/reactbits/FadeContent'

const VISITS_PAGE_SIZE = 20

const VisitManagementPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // API calls (cursor-paginated). `userVisits` is loaded only for the
  // "user" role; admin/agent roles page through `allVisits` instead.
  const userPager = useCursorPagination(searchQuery)
  const { data: userVisits, isLoading: userVisitsLoading, isError: userVisitsError, refetch: refetchUserVisits } = useGetUserVisitsQuery(
    { cursor: userPager.cursor, limit: VISITS_PAGE_SIZE },
    { skip: user?.role !== 'user' }
  )

  const allPager = useCursorPagination(`${statusFilter}|${searchQuery}`)
  const { data: allVisits, isLoading: allVisitsLoading, isError: allVisitsError, refetch: refetchAllVisits } = useGetAllVisitsQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter, cursor: allPager.cursor, limit: VISITS_PAGE_SIZE },
    { skip: !user || user.role === 'user' }
  )

  // Exact counts via COUNT-style queries (limit=1 + include_total + status).
  // The backend returns the precise total per status, so no stat card is
  // derived from a bounded sample anymore.
  const skipStats = user?.role !== 'user'
  const totalVisitsQ = useGetUserVisitsQuery({ limit: 1, include_total: true }, { skip: skipStats })
  const requestedVisitsQ = useGetUserVisitsQuery({ limit: 1, include_total: true, status: 'requested' }, { skip: skipStats })
  const confirmedVisitsQ = useGetUserVisitsQuery({ limit: 1, include_total: true, status: 'confirmed' }, { skip: skipStats })
  const rescheduledVisitsQ = useGetUserVisitsQuery({ limit: 1, include_total: true, status: 'reschedule_suggested' }, { skip: skipStats })
  const completedVisitsQ = useGetUserVisitsQuery({ limit: 1, include_total: true, status: 'completed' }, { skip: skipStats })

  const statsFetching = totalVisitsQ.isFetching || requestedVisitsQ.isFetching || confirmedVisitsQ.isFetching || rescheduledVisitsQ.isFetching || completedVisitsQ.isFetching
  const visitStats = {
    total: totalVisitsQ.data?.total ?? 0,
    upcoming: (requestedVisitsQ.data?.total ?? 0) + (confirmedVisitsQ.data?.total ?? 0) + (rescheduledVisitsQ.data?.total ?? 0),
    completed: completedVisitsQ.data?.total ?? 0,
  }

  const [rescheduleVisit] = useRescheduleVisitMutation()
  const [cancelVisit] = useCancelVisitMutation()

  const visits = user?.role === 'user' ? userVisits?.items || [] : allVisits?.items || []
  const isVisitsFetching = user?.role === 'user' ? userVisitsLoading : allVisitsLoading
  const isVisitsError = user?.role === 'user' ? userVisitsError : allVisitsError
  const canPrev = user?.role === 'user' ? userPager.canPrev : allPager.canPrev
  const hasMore = user?.role === 'user' ? (userVisits?.has_more ?? false) : (allVisits?.has_more ?? false)

  const filteredVisits = visits.filter(visit => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (visit.property?.title?.toLowerCase().includes(query) ?? false) ||
        (visit.user?.full_name?.toLowerCase().includes(query) ?? false) ||
        (visit.agent?.user?.full_name?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  const refetchAll = () => {
    void refetchUserVisits()
    void refetchAllVisits()
  }

  const handleLoadMore = () => {
    if (user?.role === 'user') {
      if (userVisits?.next_cursor) userPager.next(userVisits.next_cursor)
    } else {
      if (allVisits?.next_cursor) allPager.next(allVisits.next_cursor)
    }
  }

  const handleLoadPrev = () => {
    if (user?.role === 'user') userPager.prev()
    else allPager.prev()
  }

  const handleRescheduleVisit = async (visitId: number, newDate: string) => {
    try {
      const normalizedDate = localInputToServerTimestamp(newDate)
      if (!normalizedDate) {
        toast({ title: 'Reschedule Failed', description: 'Enter a valid date and time.', variant: 'destructive' })
        return
      }
      await rescheduleVisit({ visitId, newDate: normalizedDate, reason: 'Rescheduled by user' }).unwrap()
      toast({ title: 'Visit Rescheduled', description: 'Visit has been rescheduled successfully.' })
      refetchAll()
    } catch (error) {
      toast({ title: 'Reschedule Failed', description: getErrorMessage(error, 'Failed to reschedule visit. Please try again.'), variant: 'destructive' })
    }
  }

  const handleCancelVisit = async (visitId: number) => {
    try {
      await cancelVisit({ visitId, reason: 'Cancelled by user' }).unwrap()
      toast({ title: 'Visit Cancelled', description: 'Visit has been cancelled successfully.' })
      refetchAll()
    } catch (error) {
      toast({ title: 'Cancellation Failed', description: getErrorMessage(error, 'Failed to cancel visit. Please try again.'), variant: 'destructive' })
    }
  }

  if (!user) {
    return <LoadingState type="cards" />
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visit Management</h1>
            <p className="text-muted-foreground">Schedule and manage property visits</p>
          </div>
          {user.role !== 'admin' && (
            <Button onClick={() => setShowScheduleDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Schedule Visit
            </Button>
          )}
        </div>
      )}
      {embedded && user.role !== 'admin' && (
        <div className="flex justify-end">
          <Button onClick={() => setShowScheduleDialog(true)} className="rounded-cohere-pill">
            <Plus className="h-4 w-4 mr-2" />Schedule Visit
          </Button>
        </div>
      )}

      {/* Stats */}
      {user.role === 'user' && (
        <FadeContent container="#main-content" threshold={0} duration={600} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-action-blue/10 p-2">
                <CalendarIcon className="h-4 w-4 text-cohere-action-blue" />
              </span>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{statsFetching ? '…' : visitStats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-coral/10 p-2">
                <Clock className="h-4 w-4 text-cohere-coral" />
              </span>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{statsFetching ? '…' : visitStats.upcoming}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-deep-green/15 p-2">
                <Check className="h-4 w-4 text-cohere-deep-green" />
              </span>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{statsFetching ? '…' : visitStats.completed}</div></CardContent>
          </Card>
        </FadeContent>
      )}

      <FadeContent
        container="#main-content"
        threshold={0}
        duration={600}
        delay={120}
        className="grid gap-6 lg:grid-cols-4"
      >
        <div className="lg:col-span-1">
          <VisitCalendar visits={visits} onDateSelect={setSelectedDate} selectedDate={selectedDate} />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <VisitFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            showStatusFilter={user.role !== 'user'}
          />

          <div className="space-y-4">
            {isVisitsFetching && visits.length === 0 ? (
              <LoadingState type="cards" />
            ) : isVisitsError ? (
              <ErrorState
                title="Failed to load visits"
                onRetry={() => refetchAll()}
              />
            ) : filteredVisits.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="h-12 w-12" />}
                title="No visits found"
                description={searchQuery ? 'Try adjusting your search' : 'Schedule your first visit to get started'}
              />
            ) : (
              <>
                {filteredVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    isAdmin={user.role === 'admin'}
                    isUser={user.role === 'user'}
                    onComplete={(v) => { setSelectedVisit(v); setShowCompleteDialog(true) }}
                    onReschedule={(id, date) => { void handleRescheduleVisit(id, date) }}
                    onCancel={(id) => { void handleCancelVisit(id) }}
                  />
                ))}
                <CursorPager
                  canPrev={canPrev}
                  hasMore={hasMore}
                  loading={isVisitsFetching}
                  onPrev={handleLoadPrev}
                  onNext={handleLoadMore}
                />
              </>
            )}
          </div>
        </div>
      </FadeContent>

      {/* Schedule Visit Dialog */}
      {user.role !== 'admin' && (
        <ScheduleVisitDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSuccess={refetchAll}
        />
      )}

      {/* Complete Visit Dialog */}
      <CompleteVisitDialog
        visit={selectedVisit}
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onSuccess={refetchAll}
      />
    </div>
  )
}

export default VisitManagementPage
