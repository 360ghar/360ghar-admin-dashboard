import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { SortableHeader } from '@/components/ui/data-table'
import { formatCurrency, formatDate } from '@/lib/format'
import { getBookingPaymentStatusColor, getBookingStatusColor } from '@/lib/statusColors'
import type { BookingStaff } from '@/types/api'

export const bookingColumns: ColumnDef<BookingStaff>[] = [
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
    enableSorting: false,
  },
  {
    id: 'guest',
    header: 'Guest',
    cell: ({ row }) => row.original.guest?.display_name ?? row.original.primary_guest_name,
    enableSorting: false,
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
    id: 'amount',
    accessorKey: 'total_amount',
    header: ({ column }) => <SortableHeader column={column}>Amount</SortableHeader>,
    cell: ({ row }) => {
      const amount = row.original.total_amount
      return formatCurrency(amount)
    },
  },
  {
    accessorKey: 'booking_status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.booking_status
      return <Badge variant={getBookingStatusColor(status)}>{status}</Badge>
    },
  },
  {
    accessorKey: 'payment_status',
    header: ({ column }) => <SortableHeader column={column}>Payment</SortableHeader>,
    cell: ({ row }) => {
      const status = row.original.payment_status
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
]

export function renderBookingCard(booking: BookingStaff) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{booking.property?.title ?? `Booking #${booking.id}`}</div>
          <div className="text-sm text-muted-foreground truncate">{booking.guest?.display_name ?? booking.primary_guest_name}</div>
        </div>
        <Badge variant={getBookingStatusColor(booking.booking_status)} className="shrink-0">
          {booking.booking_status}
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
        <Badge variant={getBookingPaymentStatusColor(booking.payment_status)}>
          {booking.payment_status}
        </Badge>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/bookings/${booking.id}`}>View</Link>
        </Button>
      </div>
    </Card>
  )
}
