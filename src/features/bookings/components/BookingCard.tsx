import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { MapPin, Star, CreditCard } from 'lucide-react'
import type { Booking, BookingReview } from '@/types/api'
import { getBookingStatusColor, getBookingPaymentStatusColor } from '@/lib/statusColors'
import { formatCurrency, formatDate } from '@/lib/format'
import { BookingReviewForm } from './BookingReviewForm'

interface BookingCardProps {
  booking: Booking
  onUpdate?: (booking: Booking) => void
  onCancel?: (bookingId: number) => void
  onReview?: (bookingId: number, review: BookingReview) => void
  showActions?: boolean
}

const BookingCard = ({ booking, onUpdate, onCancel, onReview, showActions = true }: BookingCardProps) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)

  const taxesAndFees = (booking.taxes_amount ?? 0) + (booking.service_charges ?? 0)

  return (
    <Card className={`transition-all ${booking.booking_status === 'cancelled' ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{booking.property?.title || `Property #${booking.property_id}`}</h3>
                <p className="text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {[booking.property?.city, booking.property?.locality].filter(Boolean).join(', ') || 'Location unavailable'}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={getBookingStatusColor(booking.booking_status)}>
                  {booking.booking_status}
                </Badge>
                <Badge variant={getBookingPaymentStatusColor(booking.payment_status)}>
                  {booking.payment_status}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <span className="text-muted-foreground">Check-in:</span>
                <p className="font-medium">{formatDate(booking.check_in_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Check-out:</span>
                <p className="font-medium">{formatDate(booking.check_out_date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guests:</span>
                <p className="font-medium">{booking.guests}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
              </div>
            </div>

            {booking.special_requests && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Special Requests:</strong> {booking.special_requests}
                </p>
              </div>
            )}

            {showDetails && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Primary Guest:</span>
                    <p className="font-medium">{booking.primary_guest_name || '—'}</p>
                    <p className="text-sm text-muted-foreground">{booking.primary_guest_phone || '—'}</p>
                    <p className="text-sm text-muted-foreground">{booking.primary_guest_email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Details:</span>
                    <p className="text-sm">Method: {booking.payment_method || 'N/A'}</p>
                    <p className="text-sm">Transaction ID: {booking.transaction_id || 'N/A'}</p>
                    {booking.payment_date && (
                      <p className="text-sm">
                        Paid on: {formatDate(booking.payment_date)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base Price:</span>
                    <p>{formatCurrency(booking.base_amount)} × {booking.nights ?? 0} nights</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Taxes & Fees:</span>
                    <p>{formatCurrency(taxesAndFees)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <p className="font-semibold">{formatCurrency(booking.total_amount)}</p>
                  </div>
                </div>

                {booking.guest_rating && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < booking.guest_rating! ? 'text-yellow-400 fill-current' : 'text-muted-foreground opacity-30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{booking.guest_rating}/5</span>
                    </div>
                    {booking.guest_review && (
                      <p className="text-sm">{booking.guest_review}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:w-48">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'View Details'}
            </Button>

            {showActions && booking.booking_status === 'confirmed' && booking.payment_status !== 'paid' && (
              <Button
                size="sm"
                onClick={() => onUpdate?.(booking)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}

            {showActions && booking.booking_status === 'completed' && !booking.guest_rating && (
                  <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Star className="h-4 w-4 mr-2" />
                    Add Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Review</DialogTitle>
                    <DialogDescription>
                      Share your experience with this property
                    </DialogDescription>
                  </DialogHeader>
                  <BookingReviewForm
                    onSubmit={(review) => { onReview?.(booking.id, review); setShowReviewDialog(false) }}
                    onCancel={() => setShowReviewDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            )}

            {showActions && ['confirmed', 'pending'].includes(booking.booking_status) && (
              <ConfirmAlertDialog
                title="Cancel Booking"
                description="Are you sure you want to cancel this booking?"
                confirmLabel="Cancel Booking"
                variant="destructive"
                onConfirm={() => onCancel?.(booking.id)}
              >
                {(openDialog) => (
                  <Button size="sm" variant="destructive" onClick={openDialog}>
                    Cancel Booking
                  </Button>
                )}
              </ConfirmAlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { BookingCard }
export type { BookingCardProps }
