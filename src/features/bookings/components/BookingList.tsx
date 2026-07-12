import { useMemo, useState, useEffect } from 'react'
import { useCancelBookingMutation, useGetAllBookingsQuery } from '@/features/bookings/api/bookingsApi'
import type { BookingsQuery } from '@/features/bookings/api/bookingsApi'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SortableHeader } from '@/components/ui/data-table'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { Download } from 'lucide-react'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { ColumnDef } from '@tanstack/react-table'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import type { Booking } from '@/types/api'
import { getBookingStatusColor, getBookingPaymentStatusColor } from '@/lib/statusColors'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useIsMobile } from '@/hooks/useMediaQuery'

const BookingList = () => {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [cancelBooking] = useCancelBookingMutation()
  const [selectedRows, setSelectedRows] = useState<Booking[]>([])

  const bookingColumns = useMemo<ColumnDef<Booking>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'id',
      header: ({ column }) => <SortableHeader column={column}>Ref</SortableHeader>,
    },
    {
      accessorKey: 'property',
      header: 'Property',
      cell: ({ row }) => row.original.property?.title ?? '-',
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => row.original.user?.full_name ?? '-',
    },
    {
      accessorKey: 'check_in_date',
      header: ({ column }) => <SortableHeader column={column}>Check-in/out</SortableHeader>,
      cell: ({ row }) => {
        const checkIn = row.original.check_in_date
        const checkOut = row.original.check_out_date
        if (!checkIn || !checkOut) return '-'
        return `${formatDate(checkIn)} – ${formatDate(checkOut)}`
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.original.total_amount
        return amount ? formatCurrency(amount) : '-'
      },
    },
    {
      accessorKey: 'booking_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.booking_status ?? 'unknown'
        return <Badge variant={getBookingStatusColor(status)}>{status}</Badge>
      },
    },
    {
      accessorKey: 'payment_status',
      header: ({ column }) => <SortableHeader column={column}>Payment</SortableHeader>,
      cell: ({ row }) => {
        const status = row.original.payment_status ?? 'unknown'
        return <Badge variant={getBookingPaymentStatusColor(status)}>{status}</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/bookings/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ], [])

  const handleBulkCancel = async () => {
    if (selectedRows.length === 0) return
    const results = await Promise.allSettled(
      selectedRows.map((b) => cancelBooking({ bookingId: b.id, reason: 'Cancelled by staff' }).unwrap()),
    )
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length
    const rejected = results.length - fulfilled
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason as unknown
    if (rejected === 0) {
      toast({ title: 'Cancelled', description: `${fulfilled} booking${fulfilled === 1 ? '' : 's'} cancelled` })
    } else if (fulfilled === 0) {
      toast({ title: 'Failed', description: getErrorMessage(firstError, `Could not cancel ${rejected} booking${rejected === 1 ? '' : 's'}`), variant: 'destructive' })
    } else {
      toast({ title: 'Partial success', description: `${fulfilled} cancelled, ${rejected} failed`, variant: 'destructive' })
    }
    setSelectedRows([])
  }

  const { filters, setFilters } = useFilterPersistence({
    key: 'bookings',
    defaultValue: {
      status: '',
      paymentStatus: '',
      q: '',
    },
  })

  const [status, setStatus] = useState(filters.status || '')
  const [paymentStatus, setPaymentStatus] = useState(filters.paymentStatus || '')
  const [q, setQ] = useState(filters.q || '')

  useEffect(() => {
    setFilters({ status, paymentStatus, q })
  }, [status, paymentStatus, q, setFilters])

  const dq = useDebounce(q)

  const [pageSize, setPageSize] = useState(10)
  const pager = useCursorPagination(`${status}|${paymentStatus}|${dq}|${pageSize}`)

  const params = useMemo(() => {
    const base: BookingsQuery & { q?: string; payment_status?: string } = {}
    if (status) base.status = status
    if (paymentStatus) base.payment_status = paymentStatus
    if (dq) base.q = dq
    return base
  }, [status, paymentStatus, dq])

  const { data, isFetching, isLoading, error, refetch } = useGetAllBookingsQuery({ ...params, cursor: pager.cursor, limit: pageSize })

  const activeFilterCount = (status ? 1 : 0) + (paymentStatus ? 1 : 0) + (q ? 1 : 0)

  const clearAll = () => {
    setStatus('')
    setPaymentStatus('')
    setQ('')
  }

  const handleExport = () => {
    const rows = (data?.items ?? []).map((b) => ({
      id: b.id,
      property_title: b.property?.title,
      user_name: b.user?.full_name,
      check_in_date: b.check_in_date,
      check_out_date: b.check_out_date,
      booking_status: b.booking_status,
      payment_status: b.payment_status,
      total_amount: b.total_amount,
      created_at: b.created_at,
    }))
    downloadCsv(csvFilename('bookings'), rows)
  }

  const renderCard = (booking: Booking) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{booking.property?.title ?? `Booking #${booking.id}`}</div>
          <div className="text-sm text-muted-foreground truncate">{booking.user?.full_name ?? '—'}</div>
        </div>
        <Badge variant={getBookingStatusColor(booking.booking_status ?? '')} className="shrink-0">
          {booking.booking_status ?? 'unknown'}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        {booking.check_in_date && booking.check_out_date
          ? `${formatDate(booking.check_in_date)} – ${formatDate(booking.check_out_date)}`
          : '—'}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {booking.total_amount != null ? formatCurrency(booking.total_amount) : '—'}
        </span>
        <Badge variant={getBookingPaymentStatusColor(booking.payment_status ?? '')}>
          {booking.payment_status ?? '—'}
        </Badge>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/bookings/${booking.id}`}>View</Link>
        </Button>
      </div>
    </Card>
  )

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
              <SelectItem value="unpaid">Unpaid</SelectItem>
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
                  <SelectItem value="unpaid">Unpaid</SelectItem>
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
          {selectedRows.length > 0 && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border bg-background/95 p-3 backdrop-blur">
              <span className="text-sm font-medium">{selectedRows.length} selected</span>
              <ConfirmAlertDialog
                title="Cancel selected bookings?"
                description={`This will cancel ${selectedRows.length} booking${selectedRows.length === 1 ? '' : 's'}. This action cannot be undone.`}
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
              <Button variant="outline" size="sm" onClick={() => setSelectedRows([])}>Clear</Button>
            </div>
          )}
          <ResponsiveDataTable
            columns={bookingColumns}
            data={data.items}
            enableSorting
            enableRowSelection
            onSelectionChange={setSelectedRows}
            mobileCardRender={renderCard}
            viewStorageKey="bookings-table"
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
