import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Edit, FileText } from 'lucide-react'
import type { BugReport, BugReportUpdate } from '@/types/api'
import { formatDateTime } from '@/lib/format'
import { BugReportUpdateForm } from './BugReportUpdateForm'

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const statusColors: Record<string, string> = {
  open: 'bg-muted text-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  closed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

interface BugReportCardProps {
  bugReport: BugReport
  onUpdate?: (id: number, data: BugReportUpdate) => void
  showActions?: boolean
}

const BugReportCard: React.FC<BugReportCardProps> = ({ bugReport, onUpdate, showActions = false }) => {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="transition-colors hover:border-cohere-hairline">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{bugReport.title}</h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {bugReport.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={severityColors[bugReport.severity] || ''}>
                    {bugReport.severity}
                  </Badge>
                  <Badge variant="outline">{bugReport.bug_type.replace('_', ' ')}</Badge>
                  <Badge className={statusColors[bugReport.status] || ''}>
                    {bugReport.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            {showDetails && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {bugReport.steps_to_reproduce && (
                  <div>
                    <h4 className="font-medium mb-2">Steps to Reproduce</h4>
                    <pre className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {bugReport.steps_to_reproduce}
                    </pre>
                  </div>
                )}

                {bugReport.expected_behavior && (
                  <div>
                    <h4 className="font-medium mb-2">Expected Behavior</h4>
                    <p className="text-sm">{bugReport.expected_behavior}</p>
                  </div>
                )}

                {bugReport.actual_behavior && (
                  <div>
                    <h4 className="font-medium mb-2">Actual Behavior</h4>
                    <p className="text-sm">{bugReport.actual_behavior}</p>
                  </div>
                )}

                {bugReport.device_info && (
                  <div>
                    <h4 className="font-medium mb-2">Device Information</h4>
                    <div className="grid gap-2 md:grid-cols-2 text-sm">
                      {bugReport.device_info.os && (
                        <div>OS: {bugReport.device_info.os}</div>
                      )}
                      {bugReport.device_info.version && (
                        <div>Version: {bugReport.device_info.version}</div>
                      )}
                      {bugReport.device_info.model && (
                        <div>Model: {bugReport.device_info.model}</div>
                      )}
                      {bugReport.device_info.browser && (
                        <div>Browser: {bugReport.device_info.browser}</div>
                      )}
                      {bugReport.device_info.screen_resolution && (
                        <div>Screen: {bugReport.device_info.screen_resolution}</div>
                      )}
                    </div>
                  </div>
                )}

                {bugReport.tags && bugReport.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {bugReport.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {bugReport.media_urls && bugReport.media_urls.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Media</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {bugReport.media_urls.map((mediaUrl, index) => (
                        <div key={`${mediaUrl}-${index}`} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm truncate text-primary hover:underline"
                          >
                            {mediaUrl.split('/').pop() || `Media ${index + 1}`}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bugReport.resolution && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800/40">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">Resolution Notes</h4>
                    <p className="text-sm text-green-700 dark:text-green-400">{bugReport.resolution}</p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3 text-sm pt-3 border-t">
                  <div>
                    <span className="text-muted-foreground">Reported By:</span>
                    <p className="font-medium">{bugReport.user_id ? `User #${bugReport.user_id}` : 'Anonymous'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {formatDateTime(bugReport.created_at) || '—'}
                    </p>
                  </div>
                  {bugReport.assigned_to && (
                    <div>
                      <span className="text-muted-foreground">Assigned To:</span>
                      <p className="font-medium">Agent #{bugReport.assigned_to}</p>
                    </div>
                  )}
                </div>
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

            {showActions && bugReport.status !== 'closed' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Bug Report</DialogTitle>
                    <DialogDescription>
                      Update the status and resolution of this bug report
                    </DialogDescription>
                  </DialogHeader>
                  <BugReportUpdateForm
                    bugReport={bugReport}
                    onSubmit={(data) => onUpdate?.(bugReport.id, data)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { BugReportCard }
export type { BugReportCardProps }
