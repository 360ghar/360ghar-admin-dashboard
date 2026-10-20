import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useScheduleVisitMutation } from '@/features/visits/api/visitsApi'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { localInputToServerTimestamp, serverTimestampToLocalInput } from '@/lib/dateTime'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { scheduleVisitSchema, type ScheduleVisitFormValues } from '@/features/visits/validations'

type ScheduleVisitFormData = ScheduleVisitFormValues

interface ScheduleVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const ScheduleVisitDialog: React.FC<ScheduleVisitDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const defaultScheduledDate = () => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    return serverTimestampToLocalInput(d)
  }

  const scheduleForm = useForm<ScheduleVisitFormData>({
    resolver: zodResolver(scheduleVisitSchema),
    defaultValues: {
      scheduled_date: defaultScheduledDate(),
    },
  })

  const [scheduleVisit, { isLoading: scheduling }] = useScheduleVisitMutation()
  // The picker searches on the server: the first 100 rows of the catalogue would hide the rest.
  const [propertySearch, setPropertySearch] = useState('')
  const debouncedPropertySearch = useDebounce(propertySearch.trim(), 300)
  const { currentData: properties, isFetching: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useSearchPropertiesQuery(
    { limit: 20, q: debouncedPropertySearch || undefined },
    { skip: !open },
  )

  const handleSubmit = async (data: ScheduleVisitFormData) => {
    try {
      const scheduledDate = localInputToServerTimestamp(data.scheduled_date)
      if (!scheduledDate) {
        scheduleForm.setError('scheduled_date', { message: 'Enter a valid date and time' })
        return
      }
      await scheduleVisit({ ...data, scheduled_date: scheduledDate }).unwrap()
      toast({ title: 'Visit Scheduled', description: 'Your visit has been scheduled successfully.' })
      onOpenChange(false)
      scheduleForm.reset({ scheduled_date: defaultScheduledDate() })
      onSuccess?.()
    } catch (error) {
      applyServerValidation(error, scheduleForm.setError)
      toast({
        title: 'Scheduling Failed',
        description: getErrorMessage(error, 'Failed to schedule visit. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  const fieldErrors = scheduleForm.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule New Visit</DialogTitle>
          <DialogDescription>Select a property and schedule a visit</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void scheduleForm.handleSubmit(handleSubmit)(e)} className="space-y-4">
          <FormRootError form={scheduleForm} />
          {propertiesError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load properties. <Button type="button" variant="link" size="sm" onClick={() => { void refetchProperties() }}>Retry</Button>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="property_id">Property</Label>
            <Input
              aria-label="Search properties"
              placeholder="Search properties by title or place"
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
            />
            <Select
              value={scheduleForm.watch('property_id')?.toString() || undefined}
              onValueChange={(value) => scheduleForm.setValue('property_id', Number(value), { shouldValidate: true })}
              disabled={propertiesLoading || Boolean(propertiesError)}
            >
              <SelectTrigger><SelectValue placeholder={propertiesLoading ? "Loading properties..." : "Select a property"} /></SelectTrigger>
              <SelectContent>
                {properties?.items?.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.title} - {property.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.property_id && (
              <p className="text-sm text-destructive">{fieldErrors.property_id.message}</p>
            )}
            {!propertiesLoading && !propertiesError && properties?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">{debouncedPropertySearch ? 'No properties match this search.' : 'No properties are available for a visit.'}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Date & Time</Label>
            <Input
              id="scheduled_date"
              type="datetime-local"
              {...scheduleForm.register('scheduled_date')}
            />
            {fieldErrors.scheduled_date && (
              <p className="text-sm text-destructive">{fieldErrors.scheduled_date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Textarea
              id="special_requirements"
              {...scheduleForm.register('special_requirements')}
              placeholder="Any special requirements or notes..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={scheduling || Boolean(propertiesError)} className="flex-1">
              {scheduling ? 'Scheduling...' : 'Schedule Visit'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { ScheduleVisitDialog }
