import {useState} from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'
import {
  useGetBugReportsQuery,
  useUpdateBugReportMutation} from '@/features/core/api/coreApi'
import { Bug, AlertTriangle, CheckCircle, Clock, Download } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { BugReportUpdate } from '@/types/api'
import { BugReportCard } from '@/features/core/components/bug-reports/BugReportCard'
import { CreateBugReportDialog } from '@/features/core/components/bug-reports/CreateBugReportDialog'
import { downloadCsv, csvFilename } from '@/lib/csv'

const BugReportsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const pager = useCursorPagination(`${statusFilter}|${typeFilter}`)

  const { data: bugReports, isLoading, isError, refetch } = useGetBugReportsQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    bug_type: typeFilter === 'all' ? undefined : typeFilter,
    cursor: pager.cursor,
    limit: 20,
    include_total: true})

  const [updateBugReport] = useUpdateBugReportMutation()

  const reports = bugReports?.items ?? []

  const filteredReports = reports.filter(report => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        String(report.user_id ?? '').includes(query)
      )
    }
    return true
  })

  const handleUpdateBugReport = async (id: number, data: BugReportUpdate) => {
    try {
      await updateBugReport({ id, data }).unwrap()
      toast({
        title: 'Report Updated',
        description: 'Bug report has been updated successfully.'})
      void refetch()
    } catch (error: unknown) {
      toast({
        title: 'Update Failed',
        description: getErrorMessage(error, 'Failed to update bug report. Please try again.'),
        variant: 'destructive'})
    }
  }

  // Statistics
  const stats = {
    total: bugReports?.total ?? reports.length,
    open: reports.filter(r => r.status === 'open').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.severity === 'critical').length}

  const handleExport = () => {
    const rows = reports.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      severity: r.severity,
      bug_type: r.bug_type,
      source: r.source,
      user_id: r.user_id,
      app_version: r.app_version,
      created_at: r.created_at}))
    downloadCsv(csvFilename('bug-reports'), rows)
  }

  if (isLoading) return <LoadingState type="card" rows={5} />
  if (isError) return <ErrorState title="Failed to load bug reports" onRetry={() => void refetch()} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bug Reports</h1>
          <p className="text-muted-foreground">
            Track and manage bug reports and issues
          </p>
        </div>
        <CreateBugReportDialog onSuccess={() => { void refetch() }} />
      </div>

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Status counts (Open / In Progress / Resolved / Critical) are from the current page sample (up to 20). Total uses the server total when available.
      </p>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search bug reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ui_bug">UI Bug</SelectItem>
                <SelectItem value="functionality_bug">Functionality Bug</SelectItem>
                <SelectItem value="performance_issue">Performance Issue</SelectItem>
                <SelectItem value="crash">Crash</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading} className="gap-2 self-end">
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bug Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <EmptyState
            icon={<Bug className="h-12 w-12" />}
            title="No bug reports found"
            description={searchQuery ? 'Try adjusting your search' : 'Create your first bug report to get started'}
          />
        ) : (
          filteredReports.map((bugReport) => (
            <BugReportCard
              key={bugReport.id}
              bugReport={bugReport}
              onUpdate={(id, data) => { void handleUpdateBugReport(id, data) }}
              showActions={user?.role === 'admin'}
            />
          ))
        )}
      </div>
      <CursorPager
        hasMore={bugReports?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(bugReports?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isLoading}
      />
    </div>
  )
}

export default BugReportsPage
