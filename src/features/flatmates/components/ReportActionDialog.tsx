import { AlertTriangle, Flag, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import type { FlatmatesReport, ReportModerationAction } from '../types'
import { reasonLabels } from './reportLabels'

type ReportAction = ReportModerationAction['action']

interface ReportActionDialogProps {
  open: boolean
  selectedReport: FlatmatesReport | null
  action: ReportAction
  notes: string
  isModerating: boolean
  onOpenChange: (open: boolean) => void
  onActionChange: (action: ReportAction) => void
  onNotesChange: (notes: string) => void
  onSubmit: () => void
}

export function ReportActionDialog({
  open,
  selectedReport,
  action,
  notes,
  isModerating,
  onOpenChange,
  onActionChange,
  onNotesChange,
  onSubmit,
}: ReportActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onValueChange={(v) => onActionChange(v as ReportAction)}
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
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Document your decision and reasoning..."
                rows={4}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
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
  )
}
