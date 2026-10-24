import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useGetVisitQuery, useRescheduleVisitMutation, useCancelVisitMutation, useCompleteVisitMutation } from '@/features/visits/api/visitsApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { localInputToServerTimestamp, serverTimestampToLocalInput } from '@/lib/dateTime'
import { getVisitStatusColor, getVisitStatusLabel } from '@/lib/statusColors'
import FadeContent from '@/components/reactbits/FadeContent'
import { VISIT_CONTEXT_LABELS, counterpartyName, visitAgentName, visitorName } from '@/features/visits/constants'

const VisitDetail = ({ id }: { id: number }) => {
  const navigate = useNavigate()
  const visit = useGetVisitQuery(id, { skip: !id || Number.isNaN(id) })
  const [open, setOpen] = useState<'reschedule' | 'cancel' | 'complete' | null>(null)
  const [date, setDate] = useState('')
  const [text, setText] = useState('')
  const [reschedule, resState] = useRescheduleVisitMutation()
  const [cancel, cancelState] = useCancelVisitMutation()
  const [complete, compState] = useCompleteVisitMutation()
  const { toast } = useToast()

  const data = visit.currentData
  const isLoading = visit.isLoading || (visit.isFetching && !data)
  const error = visit.error

  if (!id || Number.isNaN(id)) {
    return <EmptyState title="Invalid visit id" description="The URL does not contain a valid identifier." />
  }

  if (error) {
    return <ErrorState title="Failed to load visit" error={error} onRetry={() => { void visit.refetch() }} />
  }

  if (isLoading) {
    return <LoadingState type="card" rows={6} />
  }

  if (!data) {
    return <EmptyState title="Visit not found" description="This visit is no longer available." />
  }

  const doReschedule = async () => {
    const newDate = localInputToServerTimestamp(date)
    if (!newDate) {
      toast({ title: 'Failed', description: 'Enter a valid date and time', variant: 'destructive' })
      return
    }
    try {
      await reschedule({ visitId: id, newDate, reason: text.trim() || undefined }).unwrap()
      toast({ title: 'Rescheduled', description: 'Visit rescheduled' })
      setOpen(null)
    } catch (err: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(err, 'Try again'), variant: 'destructive' })
    }
  }

  const doCancel = async () => {
    // The backend requires a reason (1 to 1000 characters after trimming). Do not invent one.
    const reason = text.trim()
    if (!reason) {
      toast({ title: 'Reason required', description: 'Enter why the visit is cancelled.', variant: 'destructive' })
      return
    }
    try {
      await cancel({ visitId: id, reason: reason.slice(0, 1000) }).unwrap()
      toast({ title: 'Cancelled', description: 'Visit cancelled' })
      setOpen(null)
    } catch (err: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(err, 'Try again'), variant: 'destructive' })
    }
  }

  const doComplete = async () => {
    if (!text.trim()) {
      toast({ title: 'Notes required', description: 'Add visit notes before completing.', variant: 'destructive' })
      return
    }
    try {
      await complete({ visitId: id, notes: text.trim() }).unwrap()
      toast({ title: 'Completed', description: 'Visit marked as completed' })
      setOpen(null)
      setText('')
    } catch (err: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(err, 'Try again'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visit Details"
        icon={CalendarDays}
        badge={data?.status ? getVisitStatusLabel(data.status) : undefined}
        actions={
          <Button variant="ghost" size="sm" onClick={() => void navigate(-1)} aria-label="Go back">
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
              <div><span className="text-muted-foreground">Visitor:</span> {visitorName(data)}</div>
              <div><span className="text-muted-foreground">Type:</span> {data.visit_context ? VISIT_CONTEXT_LABELS[data.visit_context] : '-'}</div>
              {counterpartyName(data) ? <div><span className="text-muted-foreground">Meeting with:</span> {counterpartyName(data)}</div> : null}
              {visitAgentName(data) ? <div><span className="text-muted-foreground">Agent:</span> {visitAgentName(data)}</div> : null}
              <div><span className="text-muted-foreground">Scheduled:</span> {data?.scheduled_date ? formatDateTime(data.scheduled_date) : '-'}</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                {data?.status ? <Badge variant={getVisitStatusColor(data.status)}>{getVisitStatusLabel(data.status)}</Badge> : <span>-</span>}
              </div>
              {data.actual_date ? <div><span className="text-muted-foreground">Completed:</span> {formatDateTime(data.actual_date)}</div> : null}
              {data.cancellation_reason ? <div><span className="text-muted-foreground">Reason:</span> {data.cancellation_reason}</div> : null}
              {data?.visit_notes ? <div><span className="text-muted-foreground">Notes:</span> {data.visit_notes}</div> : null}
              {data?.visitor_feedback ? <div><span className="text-muted-foreground">Feedback:</span> {data.visitor_feedback}</div> : null}
            </div>
            <div className="mt-4 flex gap-2">
              {(data?.status === 'requested' || data?.status === 'confirmed' || data?.status === 'reschedule_suggested') && (
                <>
                  <Button onClick={() => { setDate(serverTimestampToLocalInput(data?.scheduled_date) ?? ''); setText(''); setOpen('reschedule') }}>Reschedule</Button>
                  <Button variant="outline" onClick={() => { setOpen('cancel') }}>Cancel</Button>
                  <Button variant="outline" onClick={() => { setOpen('complete') }}>Mark Completed</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeContent>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{({ reschedule: 'Reschedule Visit', cancel: 'Cancel Visit', complete: 'Complete Visit' } as Record<string, string>)[open ?? ''] || ''}</DialogTitle>
          </DialogHeader>
          {open === 'reschedule' && (
            <Input type="datetime-local" value={date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} />
          )}
          <Input placeholder={open === 'complete' ? 'Notes' : open === 'reschedule' ? 'Reason (optional)' : 'Reason'} maxLength={1000} value={text} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
            {open === 'reschedule' && (
              <Button onClick={() => { void doReschedule() }} disabled={!date || resState.isLoading}>{resState.isLoading ? 'Saving…' : 'Reschedule'}</Button>
            )}
            {open === 'cancel' && <Button onClick={() => { void doCancel() }} disabled={cancelState.isLoading || !text.trim()}>{cancelState.isLoading ? 'Cancelling…' : 'Cancel Visit'}</Button>}
            {open === 'complete' && <Button onClick={() => { void doComplete() }} disabled={compState.isLoading || !text.trim()}>{compState.isLoading ? 'Saving…' : 'Complete'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VisitDetail
