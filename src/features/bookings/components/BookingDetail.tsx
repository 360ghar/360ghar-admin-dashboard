import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { useAddReviewMutation, useCancelBookingMutation, useGetBookingQuery, useProcessPaymentMutation } from '@/features/bookings/api/bookingsApi'
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
import type { BookingReview } from '@/types/api'
import { BookingReviewForm } from '@/features/bookings/components/BookingReviewForm'
import type { BookingReviewFormValues } from '@/features/bookings/validations'
import FadeContent from '@/components/reactbits/FadeContent'

const BookingDetail = ({ id }: { id: number }) => {
  const navigate = useNavigate()
  const booking = useGetBookingQuery(id, { skip: !id || Number.isNaN(id) })
  const [open, setOpen] = useState<'cancel' | 'payment' | 'review' | null>(null)
  const [text, setText] = useState('')
  const [payment, setPayment] = useState({ method: 'upi', txn: '', amount: '' })
  const [cancel, cancelState] = useCancelBookingMutation()
  const [pay, payState] = useProcessPaymentMutation()
  const [review] = useAddReviewMutation()
  const { toast } = useToast()

  const data = booking.data
  const isLoading = booking.isLoading
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

  const doCancel = async () => {
    try {
      await cancel({ bookingId: id, reason: text || 'Changed plans' }).unwrap()
      toast({ title: 'Cancelled', description: 'Booking cancelled' })
      setOpen(null)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }
  const doPay = async () => {
    try {
      await pay({ bookingId: id, paymentData: { payment_method: payment.method, transaction_id: payment.txn, amount: Number(payment.amount) } }).unwrap()
      toast({ title: 'Payment processed', description: 'Payment recorded' })
      setOpen(null)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }
  const doReview = async (values: BookingReviewFormValues) => {
    try {
      const reviewData: BookingReview = { guest_rating: values.guest_rating, guest_review: values.guest_review || 'Great stay.' }
      await review({ bookingId: id, reviewData }).unwrap()
      toast({ title: 'Review added', description: 'Thank you' })
      setOpen(null)
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
              <div><span className="text-muted-foreground">User:</span> {data?.user?.full_name || (data?.user_id != null ? `#${data.user_id}` : '-')}</div>
              <div><span className="text-muted-foreground">Stay:</span> {data ? `${formatDate(data.check_in_date)} – ${formatDate(data.check_out_date)}` : '-'}</div>
              <div><span className="text-muted-foreground">Nights:</span> {data?.nights ?? '-'}</div>
              <div><span className="text-muted-foreground">Amount:</span> {data?.total_amount ? formatCurrency(data.total_amount) : '-'}</div>
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
                  <Button variant="outline" onClick={() => setOpen('payment')}>Process Payment</Button>
                </>
              )}
              {data?.booking_status === 'completed' && <Button onClick={() => setOpen('review')}>Add Review</Button>}
            </div>
          </CardContent>
        </Card>
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
                  <Select value={payment.method} onValueChange={(value) => setPayment({ ...payment, method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Transaction ID</Label>
                  <Input value={payment.txn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayment({ ...payment, txn: e.target.value })} />
                  <Label>Amount</Label>
                  <Input type="number" value={payment.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPayment({ ...payment, amount: e.target.value })} />
                </div>
              ) : (
                <Input placeholder="Reason" value={text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)} />
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
                {open === 'cancel' && (
                  <Button onClick={() => { void doCancel() }} disabled={cancelState.isLoading}>
                    {cancelState.isLoading ? 'Cancelling…' : 'Cancel Booking'}
                  </Button>
                )}
                {open === 'payment' && (
                  <Button onClick={() => { void doPay() }} disabled={payState.isLoading || !payment.txn || !payment.amount}>
                    {payState.isLoading ? 'Processing…' : 'Process'}
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
