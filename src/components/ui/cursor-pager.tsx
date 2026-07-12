import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface CursorPagerProps {
  /** Whether a previous page exists (cursor history stack is non-empty). */
  canPrev: boolean
  /** `has_more` from the current page's response — gates the Next button. */
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
  loading?: boolean
  /** Optional: disable Next when next_cursor is missing even if has_more is true. */
  nextCursor?: string | null
}

/**
 * Prev/Next pager driven by opaque cursors and `has_more` instead of page
 * numbers / total counts. Replaces the legacy page-number `<Pagination>`.
 */
export function CursorPager({
  canPrev,
  hasMore,
  onPrev,
  onNext,
  loading,
  nextCursor,
}: CursorPagerProps) {
  const canNext =
    hasMore &&
    !loading &&
    (nextCursor === undefined ? true : nextCursor != null && nextCursor !== '')

  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading page" />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!canPrev || loading}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default CursorPager
