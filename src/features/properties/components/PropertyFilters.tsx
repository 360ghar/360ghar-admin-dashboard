import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileFilters } from '@/components/ui/mobile-filters'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Filter, X, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'
import type { Amenity } from '@/types/api'
import { PROPERTY_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, KITCHEN_TYPE_OPTIONS, VENTILATION_TYPE_OPTIONS, FURNISHING_LEVEL_OPTIONS } from '../constants'
import FilterControls from './PropertyFilterControls'

export interface PropertyFiltersState {
  q: string; city: string; locality: string; propertyType: string; purpose: string; status: string
  priceMin: string; priceMax: string; bedroomsMin: string; bedroomsMax: string
  amenities: number[]; radius: string; sortBy: string; showFilters: boolean
  furnishing: string; kitchenType: string; ventilationType: string; windowsMin: string; hasLift: boolean
}

export interface PropertyFiltersProps {
  filters: PropertyFiltersState
  setFilters: (patch: Partial<PropertyFiltersState>) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  selectedAmenities: number[]
  handleAmenityToggle: (amenityId: number) => void
  amenities: Amenity[]
  activeFilterCount: number
  pageSize: number
  onPageSizeChange: (size: number) => void
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters, setFilters, clearFilters, hasActiveFilters, selectedAmenities,
  handleAmenityToggle, amenities, activeFilterCount, pageSize, onPageSizeChange,
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 md:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search properties..." value={filters.q} onChange={(e) => setFilters({ q: e.target.value })} className="pl-10" />
      </div>
      <div className="md:hidden">
        <MobileFilters activeCount={activeFilterCount} onClear={clearFilters} title="Property Filters">
          <FilterControls filters={filters} setFilters={setFilters} selectedAmenities={selectedAmenities}
            handleAmenityToggle={handleAmenityToggle} amenities={amenities} clearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
        </MobileFilters>
      </div>
      <Button variant="outline" onClick={() => setFilters({ showFilters: !filters.showFilters })} aria-label="Open filters"
        className={`hidden md:flex ${hasActiveFilters ? 'border-primary text-primary' : ''}`}>
        <Filter className="h-4 w-4 mr-2" />Filters
        {hasActiveFilters && <Badge variant="secondary" className="ml-2">Active</Badge>}
      </Button>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden md:flex">
          <X className="h-4 w-4 mr-2" />Clear
        </Button>
      )}
      <div className="hidden md:block w-40 ml-auto">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
          <SelectContent>{[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    {filters.showFilters && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.3 }} className="hidden md:block overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t">
          <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v })}>
            <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem><SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem><SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="popular">Popular</SelectItem><SelectItem value="relevance">Relevance</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="City" value={filters.city} onChange={(e) => setFilters({ city: e.target.value })} />
          <Input placeholder="Locality" value={filters.locality} onChange={(e) => setFilters({ locality: e.target.value })} />
          <Select value={filters.propertyType || 'all'} onValueChange={(v) => setFilters({ propertyType: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Property type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.purpose || 'all'} onValueChange={(v) => setFilters({ purpose: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Purpose" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PROPERTY_PURPOSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ status: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROPERTY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="w-full justify-start" aria-label="Filter by amenities"><Filter className="h-4 w-4 mr-2" />Amenities ({selectedAmenities.length})</Button></SheetTrigger>
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
          <Input type="number" placeholder="Search Radius (km)" value={filters.radius} onChange={(e) => setFilters({ radius: e.target.value })} />
          <Input type="number" placeholder="Min Price" value={filters.priceMin} onChange={(e) => setFilters({ priceMin: e.target.value })} />
          <Input type="number" placeholder="Max Price" value={filters.priceMax} onChange={(e) => setFilters({ priceMax: e.target.value })} />
          <Input type="number" placeholder="Min Bedrooms" value={filters.bedroomsMin} onChange={(e) => setFilters({ bedroomsMin: e.target.value })} />
          <Input type="number" placeholder="Max Bedrooms" value={filters.bedroomsMax} onChange={(e) => setFilters({ bedroomsMax: e.target.value })} />
          <Select value={filters.furnishing || 'all'} onValueChange={(v) => setFilters({ furnishing: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Furnishing" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Furnishing</SelectItem>
              {FURNISHING_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.kitchenType || 'all'} onValueChange={(v) => setFilters({ kitchenType: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Kitchen type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Kitchen</SelectItem>
              {KITCHEN_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.ventilationType || 'all'} onValueChange={(v) => setFilters({ ventilationType: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Ventilation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Ventilation</SelectItem>
              {VENTILATION_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min={0} placeholder="Min Windows" value={filters.windowsMin} onChange={(e) => setFilters({ windowsMin: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={filters.hasLift} onCheckedChange={(v) => setFilters({ hasLift: !!v })} />
            Has lift
          </label>
        </div>
      </motion.div>
    )}
  </div>
)

export { PropertyFilters }
