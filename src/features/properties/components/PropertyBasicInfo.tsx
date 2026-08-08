import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AddressAutocomplete from './parts/AddressAutocomplete'
import MapPreview from './parts/MapPreview'
import LocationPicker from '@/components/common/map/LocationPicker'
import ImageUpload from '@/components/common/media/ImageUpload'
import { PROPERTY_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, PROPERTY_FEATURES, KITCHEN_TYPE_OPTIONS, VENTILATION_TYPE_OPTIONS, FURNISHING_LEVEL_OPTIONS } from '@/features/properties/constants'
import { Badge } from '@/components/ui/badge'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormValues } from '@/features/properties/validations'

interface PropertyBasicInfoProps {
  form: UseFormReturn<PropertyFormValues>
  images: string[]
  setImages: (urls: string[]) => void
  primaryImage: string | null
  setPrimaryImage: (url: string | null) => void
}

const PropertyBasicInfo: React.FC<PropertyBasicInfoProps> = ({ form, images, setImages, primaryImage, setPrimaryImage }) => {
  const { setValue, watch } = form
  const lat = watch('latitude')
  const lng = watch('longitude')
  const address = watch('address')
  const purpose = watch('purpose')
  const selectedFeatures = watch('features') || []
  const hasCoords = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))

  const toggleFeature = (feature: string) => {
    const current = form.getValues('features') || []
    const next = current.includes(feature)
      ? current.filter((f) => f !== feature)
      : [...current, feature]
    setValue('features', next, { shouldDirty: true })
  }

  return (
    <>
      <FormField control={form.control} name="title" render={({ field }) => (
        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Spacious 2BHK in Gurgaon" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} placeholder="Spacious 3BHK with modern amenities and excellent location" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
        <FormField control={form.control} name="property_type" render={({ field }) => (
          <FormItem><FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
              <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="purpose" render={({ field }) => (
          <FormItem><FormLabel>Purpose</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
              <SelectContent>{PROPERTY_PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || undefined}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
              <SelectContent>{PROPERTY_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="base_price" render={({ field }) => (
          <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" placeholder="50000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="city" render={({ field }) => (
          <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Gurgaon" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="locality" render={({ field }) => (
          <FormItem><FormLabel>Locality</FormLabel><FormControl><Input placeholder="DLF Phase 2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="pincode" render={({ field }) => (
          <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="122001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>

      <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
        <FormField control={form.control} name="area_sqft" render={({ field }) => (
          <FormItem><FormLabel>Area (sqft)</FormLabel><FormControl><Input type="number" placeholder="1200" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="bedrooms" render={({ field }) => (
          <FormItem><FormLabel>Bedrooms</FormLabel><FormControl><Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="bathrooms" render={({ field }) => (
          <FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" min={0} placeholder="2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="balconies" render={({ field }) => (
          <FormItem><FormLabel>Balconies</FormLabel><FormControl><Input type="number" min={0} placeholder="1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="parking_spaces" render={({ field }) => (
          <FormItem><FormLabel>Parking Spaces</FormLabel><FormControl><Input type="number" min={0} placeholder="1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="floor_number" render={({ field }) => (
          <FormItem><FormLabel>Floor Number</FormLabel><FormControl><Input type="number" min={0} placeholder="5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="total_floors" render={({ field }) => (
          <FormItem><FormLabel>Total Floors</FormLabel><FormControl><Input type="number" min={1} placeholder="10" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="age_of_property" render={({ field }) => (
          <FormItem><FormLabel>Age (years)</FormLabel><FormControl><Input type="number" min={0} placeholder="5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="max_occupancy" render={({ field }) => (
          <FormItem><FormLabel>Max Occupancy</FormLabel><FormControl><Input type="number" min={1} placeholder="4" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        {purpose === 'short_stay' && (
          <FormField control={form.control} name="minimum_stay_days" render={({ field }) => (
            <FormItem><FormLabel>Min Stay (days)</FormLabel><FormControl><Input type="number" min={1} placeholder="1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        )}
      </div>

      {purpose !== 'buy' && (
        <>
          <div className="md:col-span-2 text-sm font-medium text-muted-foreground mt-2">Pricing &amp; Listing Details</div>
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="monthly_rent" render={({ field }) => (
              <FormItem><FormLabel>Monthly Rent (₹)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="e.g. 45000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="daily_rate" render={({ field }) => (
              <FormItem><FormLabel>Daily Rate (₹/night)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="e.g. 1500" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="kitchen_type" render={({ field }) => (
              <FormItem><FormLabel>Kitchen Type</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {KITCHEN_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="ventilation_type" render={({ field }) => (
              <FormItem><FormLabel>Ventilation</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {VENTILATION_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="furnishing_level" render={({ field }) => (
              <FormItem><FormLabel>Furnishing</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {FURNISHING_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="setup_cost" render={({ field }) => (
              <FormItem><FormLabel>Setup Cost (₹)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="e.g. 5000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="other_charges" render={({ field }) => (
              <FormItem><FormLabel>Other Charges (₹)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="e.g. 2000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="windows_count" render={({ field }) => (
              <FormItem><FormLabel>Windows</FormLabel><FormControl><Input type="number" min={0} max={100} placeholder="e.g. 4" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="ventilation_shafts" render={({ field }) => (
              <FormItem><FormLabel>Ventilation Shafts</FormLabel><FormControl><Input type="number" min={0} max={50} placeholder="e.g. 2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="other_charges_description" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Other Charges Description</FormLabel><FormControl><Textarea rows={2} maxLength={300} placeholder="What do the other charges cover?" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </>
      )}

      <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
        <FormField control={form.control} name="owner_name" render={({ field }) => (
          <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="owner_contact" render={({ field }) => (
          <FormItem><FormLabel>Owner Contact</FormLabel><FormControl><Input placeholder="+91…" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>

      <div className="md:col-span-2">
        <FormLabel>Features</FormLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROPERTY_FEATURES.map((feature) => (
            <Badge
              key={feature}
              variant={selectedFeatures.includes(feature) ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => toggleFeature(feature)}
            >
              {feature.replaceAll('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <FormLabel>Address</FormLabel>
        <AddressAutocomplete
          value={address || ''}
          onSelect={(addr: { display_name: string; lat: string; lon: string; address?: Record<string, string | undefined> }) => {
            setValue('address', addr.display_name, { shouldDirty: true })
            setValue('latitude', Number(addr.lat), { shouldDirty: true })
            setValue('longitude', Number(addr.lon), { shouldDirty: true })
            if (addr.address) {
              setValue('city', addr.address.city || addr.address.town || addr.address.village || addr.address.municipality || addr.address.city_district || '', { shouldDirty: true })
              setValue('locality', addr.address.suburb || addr.address.neighbourhood || addr.address.quarter || addr.address.hamlet || addr.address.state_district || '', { shouldDirty: true })
              if (addr.address.postcode) {
                setValue('pincode', addr.address.postcode, { shouldDirty: true })
              }
            }
          }}
        />
        {hasCoords && (
          <div className="mt-2">
            <MapPreview lat={Number(lat)} lng={Number(lng)} />
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        <FormLabel>Location</FormLabel>
        <LocationPicker
          value={hasCoords ? { lat: Number(lat), lng: Number(lng) } : null}
          onChange={(p) => {
            setValue('latitude', p.lat, { shouldDirty: true })
            setValue('longitude', p.lng, { shouldDirty: true })
          }}
        />
      </div>
      <div className="md:col-span-2">
        <FormLabel>Media</FormLabel>
        <ImageUpload value={images} onChange={setImages} primary={primaryImage} onPrimaryChange={setPrimaryImage} />
      </div>
      <FormField control={form.control} name="latitude" render={({ field }) => (
        <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="0.000001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="longitude" render={({ field }) => (
        <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="0.000001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
      )} />
    </>
  )
}

export default PropertyBasicInfo
