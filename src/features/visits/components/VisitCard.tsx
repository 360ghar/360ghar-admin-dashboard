import { useLayoutEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MapPin, Clock, User, Check, Edit } from 'lucide-react'
import type { Visit } from '@/types/api'
import { serverTimestampToLocalInput } from '@/lib/dateTime'
import { formatDateTime } from '@/lib/format'
import { getVisitStatusColor, getVisitStatusLabel } from '@/lib/statusColors'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import TiltedCard from '@/components/reactbits/TiltedCard'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface VisitCardProps {
  visit: Visit
  isAdmin: boolean
  isUser: boolean
  onComplete: (visit: Visit) => void
  onReschedule: (visitId: number, newDate: string) => void
  onCancel: (visitId: number) => void
}

/** 1x1 transparent GIF so the tilt layer stays invisible when no photo exists. */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const VisitCard = ({
  visit,
  isAdmin: _isAdmin,
  isUser,
  onComplete,
  onReschedule,
  onCancel,
}: VisitCardProps) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(0)

  // TiltedCard needs a definite height; keep it in sync with the card's
  // content height (changes when special requirements wrap, etc.).
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setCardHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const [rescheduleDate, setRescheduleDate] = useState(serverTimestampToLocalInput(visit.scheduled_date) || '')

  const cardBody = (
    <Card ref={cardRef} className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{visit.property?.title || `Property #${visit.property_id}`}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {[visit.property?.city, visit.property?.locality].filter(Boolean).join(', ') || 'Location unavailable'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {formatDateTime(visit.scheduled_date, 'Invalid date')}
                </p>
                {!isUser && (
                  <p className="text-sm text-muted-foreground">
                    <User className="h-4 w-4 inline mr-1" />
                    {visit.user?.full_name || `User #${visit.user_id}`}
                  </p>
                )}
                {visit.agent && (
                  <p className="text-sm text-muted-foreground">
                    Agent: {visit.agent.user?.full_name || visit.agent.name || `Agent #${visit.agent_id ?? visit.agent.id}`}
                  </p>
                )}
                {visit.special_requirements && (
                  <p className="text-sm mt-2 p-2 bg-muted/40 border border-cohere-card-border/70 rounded-cohere-sm">
                    <strong>Special Requirements:</strong> {visit.special_requirements}
                  </p>
                )}
              </div>
              <Badge variant={getVisitStatusColor(visit.status)}>
                {getVisitStatusLabel(visit.status)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {(visit.status === 'requested' || visit.status === 'confirmed' || visit.status === 'reschedule_suggested') && (
              <>
                {!isUser && (
                  <Button
                    size="sm"
                    onClick={() => onComplete(visit)}
                    aria-label="Complete visit"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Reschedule Visit</SheetTitle>
                      <SheetDescription>
                        Select a new date and time for the visit
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <Label>New Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => { if (rescheduleDate) onReschedule(visit.id, rescheduleDate) }}
                        className="w-full"
                      >
                        Confirm Reschedule
                      </Button>
                      <ConfirmAlertDialog
                        title="Cancel Visit"
                        description="Are you sure you want to cancel this visit?"
                        confirmLabel="Cancel Visit"
                        variant="destructive"
                        onConfirm={() => onCancel(visit.id)}
                      >
                        {(openDialog) => (
                          <Button onClick={openDialog} variant="destructive" className="w-full">
                            Cancel Visit
                          </Button>
                        )}
                      </ConfirmAlertDialog>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (prefersReducedMotion) return cardBody

  return (
    <TiltedCard
      imageSrc={visit.property?.main_image_url || TRANSPARENT_PIXEL}
      altText={visit.property?.title || 'Property visit'}
      containerHeight={`${cardHeight}px`}
      containerWidth="100%"
      imageHeight={`${cardHeight}px`}
      imageWidth="100%"
      rotateAmplitude={2}
      scaleOnHover={1.01}
      showMobileWarning={false}
      showTooltip={false}
      displayOverlayContent
      overlayContent={cardBody}
    />
  )
}

export { VisitCard }
export type { VisitCardProps }
