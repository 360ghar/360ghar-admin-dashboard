import React, { useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UseFormReturn } from 'react-hook-form'
import type { UserPreferencesFormValues } from '@/features/users/validations'
import { FormRootError } from '@/components/ui/form-root-error'
interface PreferencesTabProps {
  preferencesForm: UseFormReturn<UserPreferencesFormValues>
  selectedPropertyTypes: string[]
  selectedLocations: string[]
  isPurpose: (value: string) => boolean
  togglePropertyType: (type: string) => void
  addLocation: (location: string) => void
  removeLocation: (location: string) => void
  onSubmit: (e: React.FormEvent) => void
  updating: boolean
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({
  preferencesForm,
  selectedPropertyTypes,
  selectedLocations,
  isPurpose,
  togglePropertyType,
  addLocation,
  removeLocation,
  onSubmit,
  updating,
}) => {
  const locationInputRef = useRef<HTMLInputElement>(null)
  return (
  <Card>
    <CardHeader>
      <CardTitle>Property Preferences</CardTitle>
      <CardDescription>Tell us what kind of properties you're interested in</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormRootError form={preferencesForm} />
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Property Types</Label>
            <p className="text-sm text-muted-foreground">Select the types of properties you're interested in</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['house', 'apartment', 'builder_floor', 'room'].map((type) => (
                <Badge
                  key={type}
                  variant={selectedPropertyTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => togglePropertyType(type)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePropertyType(type) }}
                >
                  {type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
            {preferencesForm.formState.errors.property_type && (
              <p className="text-sm text-destructive mt-1">
                {preferencesForm.formState.errors.property_type.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={preferencesForm.watch('purpose')}
                onValueChange={(value) => { if (isPurpose(value)) preferencesForm.setValue('purpose', value as UserPreferencesFormValues['purpose']) }}
              >
                <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="short_stay">Short Stay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maximum Distance (km)</Label>
              <Input type="number" {...preferencesForm.register('max_distance_km', { valueAsNumber: true })} placeholder="10" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Budget Range</Label>
              <div className="flex items-center gap-2">
                <Input type="number" {...preferencesForm.register('budget_min', { valueAsNumber: true })} placeholder="Min" />
                <span>-</span>
                <Input type="number" {...preferencesForm.register('budget_max', { valueAsNumber: true })} placeholder="Max" />
              </div>
              {(preferencesForm.formState.errors.budget_min || preferencesForm.formState.errors.budget_max) && (
                <p className="text-sm text-destructive">
                  {preferencesForm.formState.errors.budget_max?.message
                    || preferencesForm.formState.errors.budget_min?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <div className="flex items-center gap-2">
                <Input type="number" {...preferencesForm.register('bedrooms_min', { valueAsNumber: true })} placeholder="Min" />
                <span>-</span>
                <Input type="number" {...preferencesForm.register('bedrooms_max', { valueAsNumber: true })} placeholder="Max" />
              </div>
              {(preferencesForm.formState.errors.bedrooms_min || preferencesForm.formState.errors.bedrooms_max) && (
                <p className="text-sm text-destructive">
                  {preferencesForm.formState.errors.bedrooms_max?.message
                    || preferencesForm.formState.errors.bedrooms_min?.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Area (sqft)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" {...preferencesForm.register('area_min', { valueAsNumber: true })} placeholder="Min" />
                <span>-</span>
                <Input type="number" {...preferencesForm.register('area_max', { valueAsNumber: true })} placeholder="Max" />
              </div>
              {(preferencesForm.formState.errors.area_min || preferencesForm.formState.errors.area_max) && (
                <p className="text-sm text-destructive">
                  {preferencesForm.formState.errors.area_max?.message
                    || preferencesForm.formState.errors.area_min?.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label className="text-base font-medium">Preferred Locations</Label>
            <p className="text-sm text-muted-foreground">Add cities or localities you prefer</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedLocations.map((location) => (
                <Badge key={location} variant="secondary">
                  {location}
                  <button type="button" className="ml-2 text-xs" onClick={() => removeLocation(location)}>×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                ref={locationInputRef}
                placeholder="Add a location"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addLocation(e.currentTarget.value); e.currentTarget.value = '' }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (locationInputRef.current?.value) { addLocation(locationInputRef.current.value); locationInputRef.current.value = '' }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
        <Button type="submit" disabled={updating}>
          {updating ? 'Saving...' : 'Save Preferences'}
        </Button>
      </form>
    </CardContent>
  </Card>
  )
}

export default PreferencesTab
