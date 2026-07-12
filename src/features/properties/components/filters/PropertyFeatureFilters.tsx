import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PROPERTY_FEATURES } from '@/features/properties/constants'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertySearchFormValues } from '@/features/properties/validations'

interface PropertyFeatureFiltersProps {
  form: UseFormReturn<PropertySearchFormValues>
  toggleFeature: (feature: string) => void
}

const PropertyFeatureFilters: React.FC<PropertyFeatureFiltersProps> = ({ form, toggleFeature }) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>Parking Spaces (Min)</Label>
        <Input type="number" {...form.register('parking_spaces_min', { valueAsNumber: true })} placeholder="0" />
      </div>
      <div className="space-y-2">
        <Label>Floor Number</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" aria-label="Minimum floor number" {...form.register('floor_number_min', { valueAsNumber: true })} />
          <span>-</span>
          <Input type="number" placeholder="Max" aria-label="Maximum floor number" {...form.register('floor_number_max', { valueAsNumber: true })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Max Property Age (years)</Label>
        <Input type="number" {...form.register('age_max', { valueAsNumber: true })} placeholder="e.g., 5" />
      </div>
    </div>
    <div>
      <Label className="text-base">Features</Label>
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 mt-2">
        {PROPERTY_FEATURES.map(feature => (
          <div key={feature} className="flex items-center space-x-2">
            <Checkbox id={`feature-${feature}`}
              checked={form.watch('features')?.includes(feature) || false}
              onCheckedChange={() => toggleFeature(feature)} />
            <Label htmlFor={`feature-${feature}`} className="text-sm capitalize">{feature.replaceAll('_', ' ')}</Label>
          </div>
        ))}
      </div>
    </div>
    {form.watch('purpose') === 'short_stay' && (
      <>
        <Separator />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Check-in Date</Label><Input type="date" {...form.register('check_in')} /></div>
          <div className="space-y-2"><Label>Check-out Date</Label><Input type="date" {...form.register('check_out')} /></div>
          <div className="space-y-2"><Label>Guests</Label><Input type="number" {...form.register('guests', { valueAsNumber: true })} placeholder="2" min={1} /></div>
        </div>
      </>
    )}
  </div>
)

export default PropertyFeatureFilters
