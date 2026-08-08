import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import LocationPicker from '@/components/common/map/LocationPicker'
import { MapPin } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertySearchFormValues } from '@/features/properties/validations'

interface LocationFiltersProps {
  form: UseFormReturn<PropertySearchFormValues>
  selectedLocation: { latitude: number; longitude: number } | null
  setSelectedLocation: (loc: { latitude: number; longitude: number } | null) => void
}

const LocationFilters: React.FC<LocationFiltersProps> = ({ form, selectedLocation, setSelectedLocation }) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label>City</Label><Input {...form.register('city')} placeholder="e.g., Mumbai" /></div>
      <div className="space-y-2"><Label>Locality</Label><Input {...form.register('locality')} placeholder="e.g., Andheri" /></div>
      <div className="space-y-2"><Label>Pincode</Label><Input {...form.register('pincode')} placeholder="e.g., 400053" /></div>
    </div>
    <Separator />
    <div>
      <Label className="text-base">Search on Map</Label>
      <p className="text-sm text-muted-foreground mb-2">Click on the map to search around a specific location</p>
      <div className="h-64 overflow-hidden rounded-cohere-md border border-cohere-card-border">
        <LocationPicker
          value={selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : null}
          onChange={(location) => { setSelectedLocation({ latitude: location.lat, longitude: location.lng }); form.setValue('lat', location.lat); form.setValue('lng', location.lng) }}
        />
      </div>
      {selectedLocation && (
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />{selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </div>
          <div className="flex items-center gap-2">
            <Label>Radius (km):</Label>
            <Input type="number" {...form.register('radius', { valueAsNumber: true })} className="w-20" min={1} max={100} />
          </div>
        </div>
      )}
    </div>
  </div>
)

export default LocationFilters
