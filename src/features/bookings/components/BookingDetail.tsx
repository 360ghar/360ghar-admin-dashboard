import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { useAddReviewMutation, useCancelBookingMutation, useGetBookingQuery, useProcessPaymentMutation, useUpdateBookingMutation } from '@/features/bookings/api/bookingsApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDate } from '@/lib/format'
import { getBookingStatusColor, getBookingPaymentStatusColor } from '@/lib/statusColors'
import { Textarea } from '@/components/ui/textarea'
import { useUserRole } from '@/hooks/useUserRole'
import { MANUAL_PAYMENT_METHODS } from '@/features/bookings/constants'
import { BookingReviewForm } from '@/features/bookings/components/BookingReviewForm'
import type { BookingReviewFormValues } from '@/features/bookings/validations'
import FadeContent from '@/components/reactbits/FadeContent'

const BookingDetail = ({ id }: { id: number }) => {
  const navigate = useNavigate()
  const booking = useGetBookingQuery(id, { skip: !id || Number.isNaN(id) })
  const [open, setOpen] = useState<'cancel' | 'payment' | 'review' | null>(null)
  const [text, setText] = useState('')
  // A manual payment is entered by the admin: the method and the transaction id have no defaults.
  const [payment, setPayment] = useState({ method: '', txn: '', amount: '' })
  const [notes, setNotes] = useState<{ bookingId: number; value: string } | null>(null)
  const [cancel, cancelState] = useCancelBookingMutation()
  const [pay, payState] = useProcessPaymentMutation()
  const [review] = useAddReviewMutation()
  const [updateBooking, updateState] = useUpdateBookingMutation()
  const { user, isAdmin, isUser } = useUserRole()
  const { toast } = useToast()

  const data = booking.currentData
  const isLoading = booking.isLoading || (booking.isFetching && !data)
  const error = booking.error

  if (!id || Number.isNaN(id)) {
    return <EmptyState title="Invalid booking id" description="The URL does not contain a valid identifier." />
  }

  if (error) {
    return <ErrorState title="Failed to load booking" error={error} onRetry={() => { void booking.refetch() }} />
  }

  if (isLoading) {
    return <LoadingState type="card" rows={8} />
  }

  if (!data) {
    return <EmptyState title="Booking not found" description="This booking is no longer available." />
  }

  // Only the guest of a booking can review it (400 REVIEW_NOT_ALLOWED for anyone else).
  const canReview = user?.id != null && user.id === data.user_id
  const internalNotes = notes?.bookingId === data.id ? notes.value : (data.internal_notes ?? '')

  const doCancel = async () => {
    // The backend requires a reason (1 to 1000 characters after trimming). Do not invent one.
    const reason = text.trim()
    if (!reason) return
    try {
      await cancel({ booking_id: id, reason: reason.slice(0, 1000) }).unwrap()
      toast({ title: 'Cancelled', description: 'Booking cancelled' })
      setOpen(null)
      setText('')
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }
  const doPay = async () => {
    if (!isAdmin) return
    const amount = Number(payment.amount)
    if (!payment.method || !payment.txn.trim() || !Number.isFinite(amount) || amount <= 0) return
    try {
      await pay({ booking_id: id, payment_method: payment.method, transaction_id: payment.txn.trim(), amount }).unwrap()
      toast({ title: 'Payment recorded', description: 'The manual payment is recorded. No gateway was charged.' })
      setOpen(null)
      setPayment({ method: '', txn: '', amount: '' })
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }
  const doReview = async (values: BookingReviewFormValues) => {
    try {
      // Send the review text only when the guest wrote one. Nothing is invented.
      await review({ booking_id: id, guest_rating: values.guest_rating, guest_review: values.guest_review?.trim() || null }).unwrap()
      toast({ title: 'Review added', description: 'Thank you' })
      setOpen(null)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }
  const saveNotes = async () => {
    if (isUser) return
    try {
      // Staff-only field. Blank clears it.
      await updateBooking({ id, data: { internal_notes: internalNotes.trim() || null } }).unwrap()
      toast({ title: 'Saved', description: 'Internal notes updated' })
      setNotes(null)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Booking Details"
        icon={CalendarCheck}
        badge={data?.booking_status}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <FadeContent container="#main-content" threshold={0} duration={600}>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div><span className="text-muted-foreground">Property:</span> {data?.property?.title || (data?.property_id != null ? `#${data.property_id}` : '-')}</div>
              <div><span className="text-muted-foreground">Guest:</span> {data.guest?.display_name || data.primary_guest_name || `#${data.user_id}`}</div>
              <div><span className="text-muted-foreground">Stay:</span> {data ? `${formatDate(data.check_in_date)} – ${formatDate(data.check_out_date)}` : '-'}</div>
              <div><span className="text-muted-foreground">Nights:</span> {data?.nights ?? '-'}</div>
              <div><span className="text-muted-foreground">Amount:</span> {data?.total_amount ? formatCurrency(data.total_amount) : '-'}</div>
              {data.refund_amount != null ? <div><span className="text-muted-foreground">Refund:</span> {formatCurrency(data.refund_amount)}</div> : null}
              {data.cancellation_reason ? <div><span className="text-muted-foreground">Cancelled because:</span> {data.cancellation_reason}</div> : null}
              {data.actual_check_in ? <div><span className="text-muted-foreground">Checked in:</span> {formatDate(data.actual_check_in)}</div> : null}
              {data.actual_check_out ? <div><span className="text-muted-foreground">Checked out:</span> {formatDate(data.actual_check_out)}</div> : null}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                {data?.booking_status ? <Badge variant={getBookingStatusColor(data.booking_status)}>{data.booking_status}</Badge> : <span>-</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Payment:</span>
                {data?.payment_status ? <Badge variant={getBookingPaymentStatusColor(data.payment_status)}>{data.payment_status}</Badge> : <span>-</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {(data?.booking_status === 'pending' || data?.booking_status === 'confirmed') && (
                <>
                  <Button onClick={() => setOpen('cancel')}>Cancel</Button>
                  {isAdmin && <Button variant="outline" onClick={() => setOpen('payment')}>Record Payment</Button>}
                </>
              )}
              {data?.booking_status === 'completed' && canReview && <Button onClick={() => setOpen('review')}>Add Review</Button>}
            </div>
          </CardContent>
        </Card>
        {/* Staff view only: `internal_notes` is never part of the guest booking. */}
        {!isUser && <Card className="mt-4">
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              aria-label="Internal notes"
              rows={4}
              value={internalNotes}
              onChange={(e) => setNotes({ bookingId: data.id, value: e.target.value })}
              placeholder="Notes for staff. The guest never sees these."
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => { void saveNotes() }}
                disabled={updateState.isLoading || internalNotes === (data.internal_notes ?? '')}
              >
                {updateState.isLoading ? 'Saving…' : 'Save notes'}
              </Button>
            </div>
          </CardContent>
        </Card>}
      </FadeContent>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{open}</DialogTitle>
          </DialogHeader>
          {open === 'review' ? (
            <BookingReviewForm
              onSubmit={(values) => void doReview(values)}
              onCancel={() => setOpen(null)}
            />
          ) : (
            <>
              {open === 'payment' ? (
                <div className="grid gap-2">
                  <Label>Payment Method</Label>
                  <Select value={payment.method || undefined} onValueChange={(value) => setPayment({ ...payment, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select how it was paid" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUAL_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label>Transaction ID</Label>
                  <Input value={payment.txn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayment({ ...payment, txn: e.target.value })} />
                  <Label>Amount</Label>
                  <Input type="number" min={0} step="0.01" value={payment.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayment({ ...payment, amount: e.target.value })} />
                </div>
              ) : (
                <Input placeholder="Reason for cancelling" maxLength={1000} value={text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)} />
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
                {open === 'cancel' && (
                  <Button onClick={() => { void doCancel() }} disabled={cancelState.isLoading || !text.trim()}>
                    {cancelState.isLoading ? 'Cancelling…' : 'Cancel Booking'}
                  </Button>
                )}
                {open === 'payment' && (
                  <Button onClick={() => { void doPay() }} disabled={payState.isLoading || !payment.method || !payment.txn.trim() || !(Number(payment.amount) > 0)}>
                    {payState.isLoading ? 'Recording…' : 'Record payment'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookingDetail
