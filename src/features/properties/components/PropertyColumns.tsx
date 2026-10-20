import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { purposePrice } from '@/features/properties/lib/price'
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
    header: 'Property',
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
    header: 'Price',
    cell: ({ row }) => {
      const price = purposePrice(row.original)
      return (
        <div className="font-medium tabular-nums">
          {price.amount != null ? `${formatCurrency(price.amount)}${price.unit}` : '—'}
        </div>
      )
    },
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
const renderPropertyCard = (property: Property, options: {
  setConfirmId: (id: number | null) => void
  selected: boolean
  onSelect: (selected: boolean) => void
  onSetStatus: (id: number, status: PropertyStatus) => void
}) => {
  const { setConfirmId, selected, onSelect, onSetStatus } = options
  const price = purposePrice(property)
  return (
  <Card className="p-4 transition-colors hover:bg-card/80">
    <label className="mb-3 flex min-h-11 items-center gap-2 text-sm">
      <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(checked === true)} />
      Select property
    </label>
    <div className="flex flex-wrap gap-3">
      <div className="w-24 h-24 flex-shrink-0 rounded-cohere-sm overflow-hidden bg-muted">
        {property.main_image_url ? (
          <img src={property.main_image_url} alt={property.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Square className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="min-w-[7rem] flex-1">
        <div className="mb-1 flex flex-col items-start gap-1">
          <h3 className="w-full break-words font-medium leading-snug">{property.title}</h3>
          <PropertyStatusBadge status={property.status} />
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
          {price.amount != null ? `${formatCurrency(price.amount)}${price.unit}` : '—'}
        </div>
      </div>
    </div>

    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="touch-icon" aria-label="Change property status"><MoreHorizontal className="h-5 w-5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"><StatusMenuItems id={property.id} current={property.status} onSetStatus={onSetStatus} /></DropdownMenuContent>
      </DropdownMenu>
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
}

export { renderPropertyCard }
