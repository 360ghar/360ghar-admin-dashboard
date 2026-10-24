import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/hooks/useUserRole'
import {
  useGetUserBookingsQuery,
  useCancelBookingMutation,
  useAddReviewMutation,
  useGetAllBookingsQuery
} from '@/features/bookings/api/bookingsApi'
import { useNavigate } from 'react-router-dom'
import { BOOKING_STATUSES, bookingStatusLabel, isBookingStatus } from '@/features/bookings/constants'
import { CalendarIcon, Clock, Check, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import type { Booking, BookingReview, BookingStaff, BookingStatus } from '@/types/api'
import { getErrorMessage } from '@/lib/errors'
import { BookingCard } from '@/features/bookings/components/BookingCard'
import { CreateBookingDialog } from '@/features/bookings/components/CreateBookingDialog'
import FadeContent from '@/components/reactbits/FadeContent'
import { useDebounce } from '@/hooks/useDebounce'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import CursorPager from '@/components/ui/cursor-pager'

const BookingManagementPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { user, isUser } = useUserRole()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  // `/bookings/all` searches on the server (`q`: reference, guest name, guest email, property title).
  const debouncedQuery = useDebounce(searchQuery.trim(), 300)

  // API calls
  const { currentData: userBookings, isLoading: userBookingsLoading, isFetching: userBookingsFetching, isError: userBookingsError, refetch: refetchUserBookings } = useGetUserBookingsQuery(
    { limit: 100 },
    { skip: !isUser },
  )

  // Exact counts via COUNT-style queries (limit=1 + include_total + status).
  // The backend returns the precise total per status, so no stat card is
  // derived from the bounded list sample anymore.
  const skipBookingStats = !isUser
  const totalBookingsQ = useGetUserBookingsQuery({ limit: 1, include_total: true }, { skip: skipBookingStats })
  const pendingBookingsQ = useGetUserBookingsQuery({ limit: 1, include_total: true, status: 'pending' }, { skip: skipBookingStats })
  const confirmedBookingsQ = useGetUserBookingsQuery({ limit: 1, include_total: true, status: 'confirmed' }, { skip: skipBookingStats })
  const completedBookingsQ = useGetUserBookingsQuery({ limit: 1, include_total: true, status: 'completed' }, { skip: skipBookingStats })

  const bookingStats = {
    total: totalBookingsQ.isError ? '—' : totalBookingsQ.data?.total ?? '…',
    upcoming: pendingBookingsQ.isError || confirmedBookingsQ.isError
      ? '—'
      : pendingBookingsQ.data?.total != null && confirmedBookingsQ.data?.total != null
        ? pendingBookingsQ.data.total + confirmedBookingsQ.data.total
        : '…',
    completed: completedBookingsQ.isError ? '—' : completedBookingsQ.data?.total ?? '…',
  }

  // Admin/Agent view. The list is cursor-paginated (20 per page): follow next_cursor with the pager below.
  // A cursor is bound to its filters, so the pager resets when a filter changes.
  const allPager = useCursorPagination(`${user?.supabase_user_id ?? ''}|${statusFilter}|${debouncedQuery}`)
  const { currentData: allBookings, isLoading: allBookingsLoading, isFetching: allBookingsFetching, isError: allBookingsError, refetch: refetchAllBookings } = useGetAllBookingsQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter, q: debouncedQuery || undefined, cursor: allPager.cursor },
    { skip: !user || isUser },
  )

  // Mutations
  const [cancelBooking] = useCancelBookingMutation()
  const [addReview] = useAddReviewMutation()

  const bookings: Array<Booking | BookingStaff> = isUser ? userBookings?.items || [] : allBookings?.items || []

  // Staff search runs on the server. The own-bookings list has no `q`, so it filters the loaded page.
  const filteredBookings = bookings.filter(booking => {
    if (isUser && searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (booking.property?.title?.toLowerCase().includes(query) ?? false) ||
        (booking.primary_guest_name?.toLowerCase().includes(query) ?? false) ||
        (booking.primary_guest_email?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  const handleCancelBooking = async (bookingId: number, reason: string) => {
    try {
      await cancelBooking({ booking_id: bookingId, reason }).unwrap()
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled.' })
    } catch (error) {
      toast({ title: 'Cancellation Failed', description: getErrorMessage(error, 'Failed to cancel booking. Please try again.'), variant: 'destructive' })
    }
  }

  // A manual payment needs a method and a transaction id entered by the admin. Open the booking to record it.
  const handleRecordPayment = (booking: Booking | BookingStaff) => { void navigate(`/bookings/${booking.id}`) }

  const handleAddReview = async (bookingId: number, review: Omit<BookingReview, 'booking_id'>) => {
    try {
      await addReview({ booking_id: bookingId, ...review }).unwrap()
      toast({
        title: 'Review Added',
        description: 'Thank you for your review!',
      })
    } catch (error) {
      toast({
        title: 'Review Failed',
        description: getErrorMessage(error, 'Failed to add review. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  if (!user) {
    return <LoadingState type="cards" />
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Booking Management"
          description="Manage your property bookings and reservations"
          actions={
            user.role !== 'admin' ? (
              <CreateBookingDialog />
            ) : undefined
          }
        />
      )}
      {embedded && user.role !== 'admin' && (
        <div className="flex justify-end">
          <CreateBookingDialog />
        </div>
      )}

      {/* Stats */}
      {isUser && (
        <FadeContent container="#main-content" threshold={0} duration={600} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-action-blue/10 p-2">
                <CalendarIcon className="h-4 w-4 text-cohere-action-blue" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-coral/10 p-2">
                <Clock className="h-4 w-4 text-cohere-coral" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats.upcoming}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <span className="rounded-cohere-sm bg-cohere-deep-green/15 p-2">
                <Check className="h-4 w-4 text-cohere-deep-green" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingStats.completed}</div>
            </CardContent>
          </Card>
        </FadeContent>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {!isUser && (
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(isBookingStatus(value) ? value : 'all')}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {BOOKING_STATUSES.map((status) => (<SelectItem key={status} value={status}>{bookingStatusLabel(status)}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking List */}
      <FadeContent container="#main-content" threshold={0} duration={600} delay={120} className="space-y-4">
        {isUser ? (
          userBookingsLoading || (userBookingsFetching && !userBookings) ? (
            <LoadingState type="cards" />
          ) : userBookingsError ? (
            <ErrorState
              title="Failed to load bookings"
              onRetry={() => { void refetchUserBookings() }}
            />
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-12 w-12" />}
              title="No bookings found"
              description={searchQuery ? 'Try adjusting your search' : 'Create your first booking to get started'}
            />
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onUpdate={handleRecordPayment}
                onCancel={(bookingId, reason) => { void handleCancelBooking(bookingId, reason) }}
                onReview={(bookingId, review) => { void handleAddReview(bookingId, review) }}
                showActions={user.role !== 'admin'}
                canReview={booking.user_id === user.id}
              />
            ))
          )
        ) : (
          allBookingsLoading || (allBookingsFetching && !allBookings) ? (
            <LoadingState type="cards" />
          ) : allBookingsError ? (
            <ErrorState
              title="Failed to load bookings"
              onRetry={() => { void refetchAllBookings() }}
            />
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-12 w-12" />}
              title="No bookings found"
              description={searchQuery ? 'Try adjusting your search' : 'Create your first booking to get started'}
            />
          ) : (
            <>
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onUpdate={handleRecordPayment}
                  onCancel={(bookingId, reason) => { void handleCancelBooking(bookingId, reason) }}
                  onReview={(bookingId, review) => { void handleAddReview(bookingId, review) }}
                  showActions={user.role !== 'admin'}
                  canRecordPayment={user.role === 'admin'}
                  canReview={booking.user_id === user.id}
                />
              ))}
              <CursorPager
                canPrev={allPager.canPrev}
                hasMore={allBookings?.has_more ?? false}
                nextCursor={allBookings?.next_cursor}
                loading={allBookingsFetching}
                onPrev={allPager.prev}
                onNext={() => allPager.next(allBookings?.next_cursor)}
              />
            </>
          )
        )}
      </FadeContent>
    </div>
  )
}

export default BookingManagementPage
