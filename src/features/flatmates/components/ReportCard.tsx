import { AlertTriangle, Flag, MessageSquare, Shield } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { formatDateTime } from '@/lib/format'
import type { FlatmatesReport } from '../types'
import { reasonLabels, statusLabels } from './reportLabels'

interface ReportCardProps {
  report: FlatmatesReport
  onReview: (report: FlatmatesReport) => void
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

export function ReportCard({ report, onReview }: ReportCardProps) {
  return (
    <Card className="transition-colors hover:border-cohere-hairline">
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
              onClick={() => onReview(report)}
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
  )
}
