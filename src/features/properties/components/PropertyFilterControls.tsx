import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Filter } from 'lucide-react'
import { PROPERTY_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, KITCHEN_TYPE_OPTIONS, VENTILATION_TYPE_OPTIONS, FURNISHING_LEVEL_OPTIONS } from '../constants'

type FilterControlsProps = Omit<import('./PropertyFilters').PropertyFiltersProps, 'pageSize' | 'onPageSizeChange' | 'activeFilterCount'>

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  setFilters,
  selectedAmenities,
  handleAmenityToggle,
  amenities,
}) => (
  <>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Sort</label>
      <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v })}>
        <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem><SelectItem value="distance">Distance</SelectItem>
          <SelectItem value="price_low">Price: Low to High</SelectItem><SelectItem value="price_high">Price: High to Low</SelectItem>
          <SelectItem value="popular">Popular</SelectItem><SelectItem value="relevance">Relevance</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Location</label>
      <Input placeholder="City" value={filters.city} onChange={(e) => setFilters({ city: e.target.value })} />
      <Input placeholder="Locality" value={filters.locality} onChange={(e) => setFilters({ locality: e.target.value })} className="mt-2" />
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Property Type</label>
      <Select value={filters.propertyType || 'all'} onValueChange={(v) => setFilters({ propertyType: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Purpose</label>
      <Select value={filters.purpose || 'all'} onValueChange={(v) => setFilters({ purpose: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {PROPERTY_PURPOSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Status</label>
      <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ status: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {PROPERTY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Price Range</label>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Min" value={filters.priceMin} onChange={(e) => setFilters({ priceMin: e.target.value })} />
        <Input type="number" placeholder="Max" value={filters.priceMax} onChange={(e) => setFilters({ priceMax: e.target.value })} />
      </div>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Bedrooms</label>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Min" value={filters.bedroomsMin} onChange={(e) => setFilters({ bedroomsMin: e.target.value })} />
        <Input type="number" placeholder="Max" value={filters.bedroomsMax} onChange={(e) => setFilters({ bedroomsMax: e.target.value })} />
      </div>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Amenities</label>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full justify-start" aria-label="Filter by amenities">
            <Filter className="h-4 w-4 mr-2" />{selectedAmenities.length > 0 ? `${selectedAmenities.length} selected` : 'Select amenities'}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:w-[400px]">
          <SheetHeader><SheetTitle>Select Amenities</SheetTitle><SheetDescription>Choose amenities to filter properties.</SheetDescription></SheetHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {amenities.map((amenity) => (
              <div key={amenity.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                <Checkbox id={`amenity-${amenity.id}`} checked={selectedAmenities.includes(amenity.id)} onCheckedChange={() => handleAmenityToggle(amenity.id)} />
                <label htmlFor={`amenity-${amenity.id}`} className="text-sm leading-none flex-1 cursor-pointer">{amenity.title || amenity.name}</label>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Search Radius</label>
      <Input type="number" placeholder="Radius (km)" value={filters.radius} onChange={(e) => setFilters({ radius: e.target.value })} />
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Furnishing</label>
      <Select value={filters.furnishing || 'all'} onValueChange={(v) => setFilters({ furnishing: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="Any Furnishing" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Furnishing</SelectItem>
          {FURNISHING_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Kitchen Type</label>
      <Select value={filters.kitchenType || 'all'} onValueChange={(v) => setFilters({ kitchenType: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="Any Kitchen" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Kitchen</SelectItem>
          {KITCHEN_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Ventilation</label>
      <Select value={filters.ventilationType || 'all'} onValueChange={(v) => setFilters({ ventilationType: v === 'all' ? '' : v })}>
        <SelectTrigger><SelectValue placeholder="Any Ventilation" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Ventilation</SelectItem>
          {VENTILATION_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="mb-4">
      <label className="text-sm font-medium mb-1 block">Min Windows</label>
      <Input type="number" min={0} placeholder="Min windows" value={filters.windowsMin} onChange={(e) => setFilters({ windowsMin: e.target.value })} />
    </div>
    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={filters.hasLift} onCheckedChange={(v) => setFilters({ hasLift: !!v })} />
        Has lift
      </label>
    </div>
  </>
)

export default FilterControls
