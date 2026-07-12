import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormValues } from '@/features/properties/validations'
import type { Amenity } from '@/types/api'

interface PropertyAmenitiesSectionProps {
  form: UseFormReturn<PropertyFormValues>
  amenities: { data?: Amenity[]; isLoading?: boolean; [key: string]: unknown }
}

const PropertyAmenitiesSection: React.FC<PropertyAmenitiesSectionProps> = ({ form, amenities }) => (
  <>
    <FormField control={form.control} name="is_available" render={({ field }) => (
      <FormItem><FormLabel>Available</FormLabel>
        <Select
          onValueChange={(v) => field.onChange(v === 'true')}
          value={field.value === undefined || field.value === null ? undefined : field.value ? 'true' : 'false'}
        >
          <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
        </Select><FormMessage /></FormItem>
    )} />
    <FormField control={form.control} name="available_from" render={({ field }) => (
      <FormItem><FormLabel>Available From</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
    )} />
    <div className="md:col-span-2">
      <FormField control={form.control} name="amenity_ids" render={({ field }) => (
        <FormItem><FormLabel>Amenities</FormLabel>
          <FormControl>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {amenities.data?.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" value={a.id} checked={field.value?.includes(a.id) || false}
                    onChange={(e) => {
                      const currentValues = field.value || []
                      if (e.target.checked) field.onChange([...currentValues, a.id])
                      else field.onChange(currentValues.filter((v: number) => v !== a.id))
                    }} />
                  <span>{a.title || a.name}</span>
                </label>
              ))}
              {amenities.isLoading && <div className="text-sm text-muted-foreground">Loading amenities…</div>}
              {!amenities.isLoading && (!amenities.data || amenities.data.length === 0) && (
                <div className="text-sm text-muted-foreground">No amenities</div>
              )}
            </div>
          </FormControl><FormMessage /></FormItem>
      )} />
    </div>
  </>
)

export default PropertyAmenitiesSection
