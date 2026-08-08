import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/format'
import { AlertTriangle, CheckCircle2, Shield, Flag, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { LoadingState } from '@/components/ui/loading-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useGetPendingReportsQuery, useModerateReportMutation } from '../api/flatmatesApi'
import type { FlatmatesReport } from '../types'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  fake_profile: 'Fake Profile',
  abuse: 'Abuse/Harassment',
  inappropriate: 'Inappropriate Content',
  other: 'Other',
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  reviewed: 'Reviewed',
  dismissed: 'Dismissed',
  actioned: 'Actioned',
}

export function ReportsReviewPage() {
  const { toast } = useToast()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [selectedReport, setSelectedReport] = useState<FlatmatesReport | null>(null)
  const [action, setAction] = useState<'dismiss' | 'warn_user' | 'suspend_user' | 'escalate'>('dismiss')
  const [notes, setNotes] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const pager = useCursorPagination()
  const { data, isLoading, error, refetch } = useGetPendingReportsQuery({
    status: 'open',
    cursor: pager.cursor,
    limit: 20,
  })
  const [moderateReport, { isLoading: isModerating }] =
    useModerateReportMutation()

  const handleModerate = (report: FlatmatesReport) => {
    setSelectedReport(report)
    setAction('dismiss')
    setNotes('')
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedReport) return
    try {
      await moderateReport({
        reportId: selectedReport.id,
        payload: { action, notes: notes.trim() || undefined },
      }).unwrap()
      toast({ title: 'Report moderated successfully' })
      setIsDialogOpen(false)
      setSelectedReport(null)
      setAction('dismiss')
      setNotes('')
    } catch (err) {
      toast({
        title: 'Failed to moderate report',
        description: getErrorMessage(err, 'Failed to moderate report'),
        variant: 'destructive',
      })
    }
  }

  const getReasonBadge = (reason: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      spam: 'secondary',
      fake_profile: 'destructive',
      abuse: 'destructive',
      inappropriate: 'destructive',
      other: 'outline',
    }
    return (
      <Badge variant={variants[reason] || 'outline'}>
        {reasonLabels[reason] || reason}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState type="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load reports"
        error={error}
        onRetry={() => { void refetch() }}
      />
    )
  }

  const reports = data?.items ?? []

  const reportCards = (
    <div className="grid gap-4">
      {reports.map((report) => (
        <Card key={report.id} className="transition-colors hover:border-cohere-hairline">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">Report #{report.id}</h3>
                  {getReasonBadge(report.reason)}
                  <Badge variant="outline">
                    {statusLabels[report.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reported by: {report.reporter?.full_name || 'Anonymous'} • 
                  Reported: {report.reported_user?.full_name || 'Unknown User'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModerate(report)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.description && (
                <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-3 backdrop-blur-md">
                  <div className="flex items-start gap-2">
                    <Flag className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{report.description}</p>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Reporter:</span>
                  <p className="font-medium">{report.reporter?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reported User:</span>
                  <p className="font-medium">{report.reported_user?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reported:</span>
                  <p className="font-medium">
                    {formatDateTime(report.created_at)}
                  </p>
                </div>
              </div>
              {report.conversation_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Conversation ID: {report.conversation_id}</span>
                </div>
              )}
              {report.property_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Property ID: {report.property_id}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Reports Review"
        description="Review and take action on user safety reports"
        badge={`${reports.length} Pending`}
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-12 w-12" />}
          title="All reports reviewed"
          description="All reports have been reviewed."
        />
      ) : prefersReducedMotion ? (
        reportCards
      ) : (
        <FadeContent container="#main-content" threshold={0} duration={600}>
          {reportCards}
        </FadeContent>
      )}

      <CursorPager
        hasMore={data?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(data?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isLoading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Moderate User Report</DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Report ID:</span>
                  <span className="font-medium">#{selectedReport.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reason:</span>
                  <span className="font-medium">{reasonLabels[selectedReport.reason]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reporter:</span>
                  <span className="font-medium">{selectedReport.reporter?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reported User:</span>
                  <span className="font-medium">{selectedReport.reported_user?.full_name}</span>
                </div>
                {selectedReport.description && (
                  <div className="pt-2 border-t">
                    <p className="text-sm">{selectedReport.description}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Action</Label>
                <Select
                  value={action}
                  onValueChange={(v) => setAction(v as 'dismiss' | 'warn_user' | 'suspend_user' | 'escalate')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dismiss">Dismiss - No action needed</SelectItem>
                    <SelectItem value="warn_user">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                        Warn User - Send warning notification
                      </span>
                    </SelectItem>
                    <SelectItem value="suspend_user">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500 dark:text-red-400" />
                        Suspend User - Temporary account suspension
                      </span>
                    </SelectItem>
                    <SelectItem value="escalate">
                      <span className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        Escalate - Requires senior review
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document your decision and reasoning..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isModerating}
            >
              {isModerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2 inline-flex" />
                  Processing...
                </>
              ) : (
                <>Submit Decision</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportsReviewPage
