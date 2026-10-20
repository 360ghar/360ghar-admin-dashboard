import { useEffect, useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { useCancelBookingMutation } from '@/features/bookings/api/bookingsApi'
import { bookingColumns, renderBookingCard } from '@/features/bookings/components/BookingListPresentation'
import { useBookingListData } from '@/features/bookings/hooks/useBookingListData'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CursorPager from '@/components/ui/cursor-pager'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { Download } from 'lucide-react'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { scopedStorageKey } from '@/lib/storage'

const BookingList = () => {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [cancelBooking] = useCancelBookingMutation()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const {
    accountId,
    filters: { status, paymentStatus, q },
    setStatus,
    setPaymentStatus,
    setQ,
    clearFilters,
    pageSize,
    setPageSize,
    pager,
    query,
    activeFilterCount,
  } = useBookingListData()
  const { currentData: data, isFetching, isLoading, error, refetch } = query
  const selectedVisibleRows = useMemo(() => (data?.items ?? []).filter((booking) =>
    rowSelection[String(booking.id)]
  ), [data?.items, rowSelection])

  useEffect(() => {
    const visibleIds = new Set((data?.items ?? []).map((booking) => String(booking.id)))
    setRowSelection((previous) => {
      const retained = Object.fromEntries(Object.entries(previous).filter(([id]) => visibleIds.has(id)))
      return Object.keys(retained).length === Object.keys(previous).length ? previous : retained
    })
  }, [data?.items])

  const handleBulkCancel = async () => {
    if (selectedVisibleRows.length === 0) return
    const results = await Promise.allSettled(
      selectedVisibleRows.map((b) => cancelBooking({ booking_id: b.id, reason: 'Cancelled by staff' }).unwrap()),
    )
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length
    const failedRows = selectedVisibleRows.filter((_booking, index) => results[index].status === 'rejected')
    const rejected = failedRows.length
    const failedIds = failedRows.map((booking) => `#${booking.id}`).join(', ')
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason as unknown
    setRowSelection(Object.fromEntries(failedRows.map((booking) => [String(booking.id), true])))
    if (rejected === 0) {
      toast({ title: 'Cancelled', description: `${fulfilled} booking${fulfilled === 1 ? '' : 's'} cancelled` })
      return
    }
    const failureMessage = getErrorMessage(firstError, `Could not cancel ${rejected} booking${rejected === 1 ? '' : 's'}`)
    toast({
      title: fulfilled === 0 ? 'Failed' : 'Partial success',
      description: `${fulfilled} cancelled, ${rejected} failed (${failedIds}). ${failureMessage}`,
      variant: 'destructive',
    })
    throw new Error(`Could not cancel ${failedIds}. Retry the selected booking${rejected === 1 ? '' : 's'}.`)
  }

  const clearAll = clearFilters

  const handleExport = () => {
    const rows = (data?.items ?? []).map((b) => ({
      id: b.id,
      property_title: b.property?.title,
      guest_name: b.guest?.display_name ?? b.primary_guest_name,
      check_in_date: b.check_in_date,
      check_out_date: b.check_out_date,
      booking_status: b.booking_status,
      payment_status: b.payment_status,
      total_amount: b.total_amount,
      created_at: b.created_at,
    }))
    downloadCsv(csvFilename('bookings'), rows)
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-cohere-card-border/60 pb-4">
        <div className="hidden md:grid md:flex-1 gap-3 md:grid-cols-5">
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentStatus || 'all'} onValueChange={(v) => setPaymentStatus(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Payment</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search property/user" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={clearAll}>Clear</Button>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)) }}>
            <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:hidden">
          <MobileFilters activeCount={activeFilterCount} onClear={clearAll} title="Booking filters">
            <FilterSection label="Status">
              <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>
            <FilterSection label="Payment">
              <Select value={paymentStatus || 'all'} onValueChange={(v) => setPaymentStatus(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Payment</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>
            <FilterSection label="Search">
              <Input placeholder="Search property/user" value={q} onChange={(e) => setQ(e.target.value)} />
            </FilterSection>
          </MobileFilters>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || isLoading} className="gap-2 ml-auto">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>
      {error ? (
        <ErrorState title="Failed to load bookings" error={error} onRetry={() => { void refetch() }} />
      ) : isLoading || (isFetching && !data) ? (
        <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
      ) : (!data?.items || data.items.length === 0) ? (
        <EmptyState
          title={q || status || paymentStatus ? 'No results match your filters' : 'No bookings found'}
          description={q || status || paymentStatus ? 'Try adjusting search or filters.' : 'Bookings will appear here once created.'}
          action={{ label: 'Refresh', onClick: () => { void refetch() }, variant: 'outline' }}
        />
      ) : (
        <div className="space-y-4">
          {selectedVisibleRows.length > 0 && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-cohere-md border border-cohere-card-border bg-card/60 p-3 backdrop-blur-md">
              <span className="text-sm font-medium">{selectedVisibleRows.length} selected</span>
              <ConfirmAlertDialog
                title="Cancel selected bookings?"
                description={`This will cancel ${selectedVisibleRows.length} booking${selectedVisibleRows.length === 1 ? '' : 's'}. This action cannot be undone.`}
                confirmLabel="Cancel bookings"
                variant="destructive"
                onConfirm={handleBulkCancel}
              >
                {(openDialog) => (
                  <Button variant="destructive" size="sm" onClick={openDialog} disabled={isFetching || isLoading}>
                    Cancel Selected
                  </Button>
                )}
              </ConfirmAlertDialog>
              <Button variant="outline" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
            </div>
          )}
            <ResponsiveDataTable
              enableColumnVisibility
            columns={bookingColumns}
            data={data.items}
            enableSorting
            enableRowSelection
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={(booking) => String(booking.id)}
            mobileCardRender={renderBookingCard}
            viewStorageKey={accountId ? scopedStorageKey('bookings-table', accountId) : 'bookings-table-anonymous'}
          />
          <CursorPager
            canPrev={pager.canPrev}
            hasMore={data.has_more ?? false}
            nextCursor={data.next_cursor}
            loading={isFetching || isLoading}
            onPrev={pager.prev}
            onNext={() => pager.next(data.next_cursor)}
          />
        </div>
      )}
    </Card>
  )
}

export default BookingList
