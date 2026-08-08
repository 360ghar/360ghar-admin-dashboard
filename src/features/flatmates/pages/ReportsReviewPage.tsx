import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { ReportActionDialog } from '../components/ReportActionDialog'
import { ReportCard } from '../components/ReportCard'
import { useGetPendingReportsQuery, useModerateReportMutation } from '../api/flatmatesApi'
import type { FlatmatesReport, ReportModerationAction } from '../types'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type ReportAction = ReportModerationAction['action']

export function ReportsReviewPage() {
  const { toast } = useToast()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [selectedReport, setSelectedReport] = useState<FlatmatesReport | null>(null)
  const [action, setAction] = useState<ReportAction>('dismiss')
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
        <ReportCard key={report.id} report={report} onReview={handleModerate} />
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

      <ReportActionDialog
        open={isDialogOpen}
        selectedReport={selectedReport}
        action={action}
        notes={notes}
        isModerating={isModerating}
        onOpenChange={setIsDialogOpen}
        onActionChange={setAction}
        onNotesChange={setNotes}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  )
}

export default ReportsReviewPage
