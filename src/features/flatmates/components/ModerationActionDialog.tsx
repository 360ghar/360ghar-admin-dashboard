import { AlertCircle, CheckCircle2, Edit2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Textarea } from '@/components/ui/textarea'

import type { FlatmatesListing, ModerationAction } from '../types'
import {
  getListingImageUrls,
  getPrescreenFlags,
  getPrescreenReason,
  maskPhone,
} from './moderationUtils'

type ListingAction = ModerationAction['action']

interface ModerationActionDialogProps {
  open: boolean
  selectedListing: FlatmatesListing | null
  action: ListingAction
  reason: string
  isModerating: boolean
  onOpenChange: (open: boolean) => void
  onActionChange: (action: ListingAction) => void
  onReasonChange: (reason: string) => void
  onSubmit: () => void
}

export function ModerationActionDialog({
  open,
  selectedListing,
  action,
  reason,
  isModerating,
  onOpenChange,
  onActionChange,
  onReasonChange,
  onSubmit,
}: ModerationActionDialogProps) {
  const prescreenReason = selectedListing ? getPrescreenReason(selectedListing) : null
  const imageUrls = selectedListing ? getListingImageUrls(selectedListing) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Moderate Listing</DialogTitle>
        </DialogHeader>

        {selectedListing && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="grid grid-cols-2 gap-2">
                  {(imageUrls.length ? imageUrls : ['/placeholder.svg']).map((imageUrl, index) => (
                    <img
                      key={`${imageUrl}-${index}`}
                      src={imageUrl}
                      alt={`${selectedListing.title} photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-cohere-sm border border-cohere-card-border"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{selectedListing.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedListing.locality}, {selectedListing.city}
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(selectedListing.monthly_rent)}/month
                </p>
                <div className="text-xs text-muted-foreground">
                  <p>Owner: {selectedListing.owner?.full_name || 'Unknown'}</p>
                  <p>Email: {selectedListing.owner?.email || 'N/A'}</p>
                  <p>Phone: {maskPhone(selectedListing.owner?.phone)}</p>
                </div>
              </div>
            </div>

            {prescreenReason && (
              <div className="rounded-cohere-md border border-destructive/30 bg-destructive/10 p-3 backdrop-blur-md">
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-semibold">AI flag reason:</span> {prescreenReason}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {getPrescreenFlags(selectedListing).map((flag) => (
                    <Badge
                      key={`${flag.code}-${flag.field ?? ''}-${flag.matched_term ?? ''}`}
                      variant={flag.severity === 'high' ? 'destructive' : 'outline'}
                    >
                      {flag.code.replace(/_/g, ' ')}
                      {flag.field ? `: ${flag.field}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Action</Label>
              <Select value={action} onValueChange={(v) => onActionChange(v as ListingAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
                      Approve - Make listing live
                    </span>
                  </SelectItem>
                  <SelectItem value="request_edit">
                    <span className="flex items-center gap-2">
                      <Edit2 className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                      Request Edit - Send back for changes
                    </span>
                  </SelectItem>
                  <SelectItem value="reject">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                      Reject - Remove listing
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">
                Reason {action !== 'approve' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder={
                  action === 'approve'
                    ? 'Optional notes...'
                    : action === 'request_edit'
                      ? 'What changes are needed?'
                      : 'Why is this listing being rejected?'
                }
                rows={4}
                required={action !== 'approve'}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isModerating || (action !== 'approve' && !reason.trim())}>
            {isModerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2 inline-flex" />
                Processing...
              </>
            ) : (
              <>Submit Moderation</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
