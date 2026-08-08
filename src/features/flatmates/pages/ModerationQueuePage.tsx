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
import { ModerationActionDialog } from '../components/ModerationActionDialog'
import { ModerationListingCard } from '../components/ModerationListingCard'
import { useGetPendingListingsQuery, useModerateListingMutation } from '../api/flatmatesApi'
import type { FlatmatesListing, ModerationAction } from '../types'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type ListingAction = ModerationAction['action']

export function ModerationQueuePage() {
  const { toast } = useToast()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [selectedListing, setSelectedListing] = useState<FlatmatesListing | null>(null)
  const [action, setAction] = useState<ListingAction>('approve')
  const [reason, setReason] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const pager = useCursorPagination()
  const { data, isLoading, error, refetch } = useGetPendingListingsQuery({
    status: 'pending_review',
    cursor: pager.cursor,
    limit: 20,
  })
  const [moderateListing, { isLoading: isModerating }] =
    useModerateListingMutation()

  const handleModerate = (listing: FlatmatesListing) => {
    setSelectedListing(listing)
    setAction('approve')
    setReason('')
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedListing) return
    try {
      await moderateListing({
        listingId: selectedListing.id,
        payload: { action, reason: reason.trim() || undefined },
      }).unwrap()
      toast({ title: 'Listing moderated successfully' })
      setIsDialogOpen(false)
      setSelectedListing(null)
      setAction('approve')
      setReason('')
    } catch (err) {
      toast({
        title: 'Failed to moderate listing',
        description: getErrorMessage(err, 'Failed to moderate listing'),
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
        title="Failed to load moderation queue"
        error={error}
        onRetry={() => { void refetch() }}
      />
    )
  }

  const listings = data?.items ?? []

  const listingCards = (
    <div className="grid gap-4">
      {listings.map((listing) => (
        <ModerationListingCard key={listing.id} listing={listing} onReview={handleModerate} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flatmate Listing Moderation"
        description="Review and approve or reject flatmate listings"
        badge={`${listings.length} on this page`}
      />

      {listings.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-12 w-12" />}
          title="All caught up!"
          description="No pending listings to review."
        />
      ) : prefersReducedMotion ? (
        listingCards
      ) : (
        <FadeContent container="#main-content" threshold={0} duration={600}>
          {listingCards}
        </FadeContent>
      )}

      <CursorPager
        hasMore={data?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(data?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isLoading}
      />

      <ModerationActionDialog
        open={isDialogOpen}
        selectedListing={selectedListing}
        action={action}
        reason={reason}
        isModerating={isModerating}
        onOpenChange={setIsDialogOpen}
        onActionChange={setAction}
        onReasonChange={setReason}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  )
}

export default ModerationQueuePage
