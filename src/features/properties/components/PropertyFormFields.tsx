import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import ImageUpload from '@/components/common/media/ImageUpload'
import LocationPicker from '@/components/common/map/LocationPicker'
import { X, MapPin } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormPageValues } from '@/features/properties/validations'
import type { Amenity } from '@/types/api'
import type { Property } from '@/features/properties/api/propertiesApi'

interface Location { latitude: number; longitude: number }

interface PropertyFormFieldsProps {
  form: UseFormReturn<PropertyFormPageValues>
  location: Location | null
  setLocation: (loc: Location | null) => void
  uploadedImages: string[]
  setUploadedImages: (urls: string[]) => void
  removeImage: (index: number) => void
  selectedFeatures: string[]
  toggleFeature: (feature: string) => void
  toggleAmenity: (amenityId: number) => void
  amenities?: Amenity[]
  isEditing: boolean
  creating: boolean
  updating: boolean
  property?: Property
  availableFeatures: string[]
  isPropertyType: (value: string) => boolean
  isPurpose: (value: string) => boolean
  onCancel: () => void
}

const PropertyBasicInfoFields: React.FC<{ form: UseFormReturn<PropertyFormPageValues>; isPropertyType: (v: string) => boolean; isPurpose: (v: string) => boolean }> = ({ form, isPropertyType, isPurpose }) => (
  <Card>
    <CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Enter the basic details of the property</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Property Title</Label>
          <Input id="title" {...form.register('title')} placeholder="Modern 3BHK Apartment" />
          {form.formState.errors.title && <p className="text-sm text-destructive">{String(form.formState.errors.title.message)}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="property_type">Property Type</Label>
          <Select value={form.watch('property_type')} onValueChange={(value) => { if (isPropertyType(value)) form.setValue('property_type', value as PropertyFormPageValues['property_type']) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Select value={form.watch('purpose')} onValueChange={(value) => { if (isPurpose(value)) form.setValue('purpose', value as PropertyFormPageValues['purpose']) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem><SelectItem value="rent">Rent</SelectItem><SelectItem value="short_stay">Short Stay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="base_price">Base Price (₹)</Label>
          <Input id="base_price" type="number" {...form.register('base_price', { valueAsNumber: true })} placeholder="25000" />
          {form.formState.errors.base_price && <p className="text-sm text-destructive">{String(form.formState.errors.base_price.message)}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...form.register('description')} placeholder="Describe the property..." rows={4} />
        {form.formState.errors.description && <p className="text-sm text-destructive">{String(form.formState.errors.description.message)}</p>}
      </div>
    </CardContent>
  </Card>
)

const PropertyLocationFields: React.FC<{ form: UseFormReturn<PropertyFormPageValues>; location: Location | null; setLocation: (loc: Location | null) => void }> = ({ form, location, setLocation }) => (
  <Card>
    <CardHeader><CardTitle>Location</CardTitle><CardDescription>Property location details</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register('city')} placeholder="Mumbai" />
          {form.formState.errors.city && <p className="text-sm text-destructive">{String(form.formState.errors.city.message)}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="locality">Locality</Label>
          <Input id="locality" {...form.register('locality')} placeholder="Andheri" />
          {form.formState.errors.locality && <p className="text-sm text-destructive">{String(form.formState.errors.locality.message)}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" {...form.register('pincode')} placeholder="400053" />
          {form.formState.errors.pincode && <p className="text-sm text-destructive">{String(form.formState.errors.pincode.message)}</p>}
        </div>
      </div>
      <div>
        <Label className="text-base">Select Location on Map</Label>
        <p className="text-sm text-muted-foreground mb-2">Click on the map to set the property location</p>
        <div className="h-96 overflow-hidden rounded-cohere-md border border-cohere-card-border">
          <LocationPicker value={location ? { lat: location.latitude, lng: location.longitude } : null}
            onChange={(loc) => setLocation({ latitude: loc.lat, longitude: loc.lng })} />
        </div>
        {location && <div className="mt-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 inline mr-1" />{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>}
      </div>
    </CardContent>
  </Card>
)

const PropertyDetailsFields: React.FC<{ form: UseFormReturn<PropertyFormPageValues> }> = ({ form }) => (
  <Card>
    <CardHeader><CardTitle>Property Details</CardTitle><CardDescription>Specifications and features</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="area_sqft">Area (sqft)</Label><Input id="area_sqft" type="number" {...form.register('area_sqft', { valueAsNumber: true })} placeholder="1200" /></div>
        <div className="space-y-2"><Label htmlFor="bedrooms">Bedrooms</Label><Input id="bedrooms" type="number" {...form.register('bedrooms', { valueAsNumber: true })} placeholder="3" /></div>
        <div className="space-y-2"><Label htmlFor="bathrooms">Bathrooms</Label><Input id="bathrooms" type="number" {...form.register('bathrooms', { valueAsNumber: true })} placeholder="2" /></div>
        <div className="space-y-2"><Label htmlFor="balconies">Balconies</Label><Input id="balconies" type="number" {...form.register('balconies', { valueAsNumber: true })} placeholder="2" /></div>
        <div className="space-y-2"><Label htmlFor="parking_spaces">Parking Spaces</Label><Input id="parking_spaces" type="number" {...form.register('parking_spaces', { valueAsNumber: true })} placeholder="1" /></div>
        <div className="space-y-2"><Label htmlFor="floor_number">Floor Number</Label><Input id="floor_number" type="number" {...form.register('floor_number', { valueAsNumber: true })} placeholder="5" /></div>
        <div className="space-y-2"><Label htmlFor="total_floors">Total Floors</Label><Input id="total_floors" type="number" {...form.register('total_floors', { valueAsNumber: true })} placeholder="10" /></div>
        <div className="space-y-2"><Label htmlFor="age_of_property">Age (years)</Label><Input id="age_of_property" type="number" {...form.register('age_of_property', { valueAsNumber: true })} placeholder="5" /></div>
        <div className="space-y-2"><Label htmlFor="max_occupancy">Max Occupancy</Label><Input id="max_occupancy" type="number" {...form.register('max_occupancy', { valueAsNumber: true })} placeholder="6" /></div>
      </div>
      {form.watch('purpose') === 'short_stay' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="minimum_stay_days">Minimum Stay (days)</Label><Input id="minimum_stay_days" type="number" {...form.register('minimum_stay_days', { valueAsNumber: true })} placeholder="1" /></div>
        </div>
      )}
    </CardContent>
  </Card>
)

const PropertyAmenitiesFeaturesFields: React.FC<{ form: UseFormReturn<PropertyFormPageValues>; amenities?: Amenity[]; selectedFeatures: string[]; toggleFeature: (f: string) => void; toggleAmenity: (id: number) => void; availableFeatures: string[] }> = ({ form, amenities, selectedFeatures, toggleFeature, toggleAmenity, availableFeatures }) => (
  <Card>
    <CardHeader><CardTitle>Amenities & Features</CardTitle><CardDescription>Select available amenities and features</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <div>
        <Label className="text-base">Amenities</Label>
        <div className="grid gap-2 md:grid-cols-3 mt-2">
          {amenities?.map((amenity) => (
            <div key={amenity.id} className="flex items-center space-x-2">
              <Switch id={`amenity-${amenity.id}`} checked={(form.watch('amenity_ids') as number[] | undefined)?.includes(amenity.id) ?? false} onCheckedChange={() => toggleAmenity(amenity.id)} />
              <Label htmlFor={`amenity-${amenity.id}`} className="text-sm">{amenity.title || amenity.name}</Label>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-base">Features</Label>
        <p className="text-sm text-muted-foreground">Select property features</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {availableFeatures.map((feature) => (
            <Badge key={feature} variant={selectedFeatures.includes(feature) ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => toggleFeature(feature)}>
              {feature.replaceAll('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

const PropertyOwnerFields: React.FC<{ form: UseFormReturn<PropertyFormPageValues> }> = ({ form }) => (
  <Card>
    <CardHeader><CardTitle>Owner Information</CardTitle><CardDescription>Property owner details</CardDescription></CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="owner_name">Owner Name</Label><Input id="owner_name" {...form.register('owner_name')} placeholder="John Doe" /></div>
        <div className="space-y-2"><Label htmlFor="owner_contact">Owner Contact</Label><Input id="owner_contact" {...form.register('owner_contact')} placeholder="+1234567890" /></div>
      </div>
    </CardContent>
  </Card>
)

const PropertySidebar: React.FC<{ form: UseFormReturn<PropertyFormPageValues>; uploadedImages: string[]; setUploadedImages: (urls: string[]) => void; removeImage: (i: number) => void; isEditing: boolean; creating: boolean; updating: boolean; property?: Property; onCancel: () => void }> = ({ form: _form, uploadedImages, setUploadedImages, removeImage, isEditing, creating, updating, property, onCancel }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle>Property Images</CardTitle><CardDescription>Upload property photos</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ImageUpload value={uploadedImages} onChange={(urls) => setUploadedImages(urls)} />
        {uploadedImages.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Images</Label>
            <div className="grid gap-2">
              {uploadedImages.map((image, index) => (
                <div key={index} className="flex items-center gap-2 rounded-cohere-sm border border-cohere-card-border p-2">
                  <img src={image} alt={`Property ${index + 1}`} className="w-16 h-16 object-cover rounded" />
                  <span className="text-sm flex-1 truncate">Image {index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button type="submit" className="w-full" disabled={creating || updating}>
          {(creating || updating) && <LoadingSpinner size="sm" className="mr-2 inline-flex" />}
          {isEditing ? 'Update Property' : 'Create Property'}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>Cancel</Button>
      </CardContent>
    </Card>
    {isEditing && property && (
      <Card>
        <CardHeader><CardTitle>Property Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge variant={property.status === 'available' ? 'default' : 'secondary'}>{property.status}</Badge></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Created</span><span className="text-sm">{formatDate(property.created_at)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Owner ID</span><span className="text-sm">{property.owner_id}</span></div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
)

const PropertyFormFields: React.FC<PropertyFormFieldsProps> = ({ form, location, setLocation, uploadedImages, setUploadedImages, removeImage, selectedFeatures, toggleFeature, toggleAmenity, amenities, isEditing, creating, updating, property, availableFeatures, isPropertyType, isPurpose, onCancel }) => (
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2 space-y-6">
      <PropertyBasicInfoFields form={form} isPropertyType={isPropertyType} isPurpose={isPurpose} />
      <PropertyLocationFields form={form} location={location} setLocation={setLocation} />
      <PropertyDetailsFields form={form} />
      <PropertyAmenitiesFeaturesFields form={form} amenities={amenities} selectedFeatures={selectedFeatures} toggleFeature={toggleFeature} toggleAmenity={toggleAmenity} availableFeatures={availableFeatures} />
      <PropertyOwnerFields form={form} />
    </div>
    <PropertySidebar form={form} uploadedImages={uploadedImages} setUploadedImages={setUploadedImages} removeImage={removeImage} isEditing={isEditing} creating={creating} updating={updating} property={property} onCancel={onCancel} />
  </div>
)

export { PropertyFormFields }
