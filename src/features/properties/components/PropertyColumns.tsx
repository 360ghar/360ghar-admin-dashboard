import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link } from 'react-router-dom'
import { Eye, Edit, Trash2, MapPin, Bed, Bath, Square, MoreHorizontal, Check } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Property } from '@/features/properties/api/propertiesApi'
import type { PropertyStatus } from '@/types/pm'
import { formatCurrency } from '@/lib/format'
import { SortableHeader } from '@/components/ui/data-table'
import { PROPERTY_STATUS_OPTIONS, PropertyStatusBadge } from './PropertyStatusBadge'

interface PropertyColumnsProps {
  setConfirmId: (id: number | null) => void
  onSetStatus?: (id: number, status: PropertyStatus) => void
}

function StatusMenuItems({
  id,
  current,
  onSetStatus,
}: {
  id: number
  current?: string
  onSetStatus?: (id: number, status: PropertyStatus) => void
}) {
  if (!onSetStatus) return null
  return (
    <>
      <DropdownMenuLabel>Set status</DropdownMenuLabel>
      {PROPERTY_STATUS_OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.value}
          disabled={current === option.value}
          onClick={() => onSetStatus(id, option.value)}
        >
          {current === option.value ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" aria-hidden />
          )}
          {option.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
    </>
  )
}

const PropertyColumns = ({ setConfirmId, onSetStatus }: PropertyColumnsProps): ColumnDef<Property>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="text-muted-foreground">#{row.original.id}</span>,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Property</SortableHeader>,
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="font-medium">{row.original.title}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {[row.original.city, row.original.locality].filter(Boolean).join(', ') || '—'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'property_type',
    header: 'Type',
    cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.property_type}</Badge>,
  },
  {
    accessorKey: 'purpose',
    header: 'Purpose',
    cell: ({ row }) => (
      <Badge variant={row.original.purpose === 'buy' ? 'default' : 'outline'} className="capitalize">
        {row.original.purpose}
      </Badge>
    ),
  },
  {
    accessorKey: 'base_price',
    header: ({ column }) => <SortableHeader column={column}>Price</SortableHeader>,
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">
        {row.original.base_price != null ? formatCurrency(row.original.base_price) : '—'}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <PropertyStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'distance_km',
    header: 'Distance',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.distance_km ? `${row.original.distance_km.toFixed(1)} km` : 'N/A'}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" aria-label="View property">
          <Link to={`/properties/${row.original.id}/view`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" aria-label="Edit property">
          <Link to={`/properties/${row.original.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <StatusMenuItems id={row.original.id} current={row.original.status} onSetStatus={onSetStatus} />
            <DropdownMenuItem onClick={() => setConfirmId(row.original.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export { PropertyColumns }

// Mobile card renderer for properties
const renderPropertyCard = (property: Property, setConfirmId: (id: number | null) => void) => (
  <Card className="p-4 transition-colors hover:bg-card/80">
    <div className="flex gap-3">
      <div className="w-24 h-24 flex-shrink-0 rounded-cohere-sm overflow-hidden bg-muted">
        {property.main_image_url ? (
          <img src={property.main_image_url} alt={property.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Square className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium truncate">{property.title}</h3>
          <PropertyStatusBadge status={property.status} className="shrink-0" />
        </div>

        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{[property.city, property.locality].filter(Boolean).join(', ') || '—'}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          {property.bedrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" /> {property.bathrooms}
            </span>
          )}
          <Badge variant={property.purpose === 'buy' ? 'default' : 'outline'} className="text-xs capitalize">
            {property.purpose}
          </Badge>
        </div>

        <div className="font-semibold text-primary">
          {property.base_price != null ? formatCurrency(property.base_price) : '—'}
        </div>
      </div>
    </div>

    <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
      <Button asChild variant="ghost" size="touch-icon" aria-label="View property">
        <Link to={`/properties/${property.id}/view`}>
          <Eye className="h-5 w-5" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="touch-icon" aria-label="Edit property">
        <Link to={`/properties/${property.id}`}>
          <Edit className="h-5 w-5" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="touch-icon"
        onClick={() => setConfirmId(property.id)}
        className="text-destructive hover:text-destructive"
        aria-label="Delete property"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  </Card>
)

export { renderPropertyCard }
