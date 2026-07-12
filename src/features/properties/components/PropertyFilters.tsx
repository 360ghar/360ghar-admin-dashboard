import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileFilters } from '@/components/ui/mobile-filters'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Filter, X, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import type { Amenity } from '@/types/api'
import FilterControls from './PropertyFilterControls'

export interface PropertyFiltersState {
  q: string; city: string; locality: string; propertyType: string; purpose: string; status: string
  priceMin: string; priceMax: string; bedroomsMin: string; bedroomsMax: string
  amenities: number[]; radius: string; sortBy: string; showFilters: boolean
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
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="builder_floor">Builder Floor</SelectItem>
              <SelectItem value="room">Room</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="plot">Plot</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
              <SelectItem value="penthouse">Penthouse</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="loft">Loft</SelectItem>
              <SelectItem value="pg">PG</SelectItem>
              <SelectItem value="flatmate">Flatmate</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="shop">Shop</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.purpose || 'all'} onValueChange={(v) => setFilters({ purpose: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Purpose" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem><SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="rent">Rent</SelectItem><SelectItem value="short_stay">Short Stay</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ status: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="under_offer">Under Offer</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
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
        </div>
      </motion.div>
    )}
  </div>
)

export { PropertyFilters }
