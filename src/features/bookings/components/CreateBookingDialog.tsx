import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form'
import { formatCurrency } from '@/lib/format'
import { useDebounce } from '@/hooks/useDebounce'
import { skipToken } from '@reduxjs/toolkit/query'
import { useToast } from '@/hooks/use-toast'
import { useCreateBookingMutation, useCheckAvailabilityQuery, useCalculatePricingQuery } from '@/features/bookings/api/bookingsApi'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useGetPropertyQuery, useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { Plus } from 'lucide-react'
import { createBookingSchema, type CreateBookingFormValues } from '@/features/bookings/validations'
import BookingDateSelection from './parts/BookingDateSelection'

const CreateBookingDialog: React.FC<{ propertyId?: number; onSuccess?: () => void }> = ({ propertyId: externalPropertyId, onSuccess }) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(externalPropertyId)
  const [propertySearch, setPropertySearch] = useState('')
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })

  const propertyId = selectedPropertyId ?? externalPropertyId
  const { data: searchResults } = useSearchPropertiesQuery(
    { q: propertySearch, limit: 10 },
    { skip: !isOpen || !!externalPropertyId || propertySearch.length < 2 },
  )
  const { data: property } = useGetPropertyQuery(propertyId || 0, { skip: !propertyId || !isOpen })

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      property_id: externalPropertyId ?? 0,
      check_in_date: '',
      check_out_date: '',
      guests: 1,
      primary_guest_name: '',
      primary_guest_phone: '',
      primary_guest_email: '',
      special_requests: '',
    },
  })
  const guestsCount = useDebounce(Math.max(form.watch('guests') || 1, 1))

  // Keep RHF in sync with property / date pickers so Zod validation can pass.
  useEffect(() => {
    if (propertyId) {
      form.setValue('property_id', propertyId, { shouldValidate: true })
    }
  }, [propertyId, form])

  useEffect(() => {
    if (selectedDates.from) {
      form.setValue('check_in_date', selectedDates.from.toISOString(), { shouldValidate: true })
    } else {
      form.setValue('check_in_date', '')
    }
    if (selectedDates.to) {
      form.setValue('check_out_date', selectedDates.to.toISOString(), { shouldValidate: true })
    } else {
      form.setValue('check_out_date', '')
    }
  }, [selectedDates, form])

  const availabilityArgs =
    propertyId && selectedDates.from && selectedDates.to
      ? {
          property_id: propertyId,
          check_in_date: selectedDates.from.toISOString(),
          check_out_date: selectedDates.to.toISOString(),
          guests: guestsCount,
        }
      : skipToken

  const checkAvailability = useCheckAvailabilityQuery(availabilityArgs)
  const calculatePricing = useCalculatePricingQuery(availabilityArgs)
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation()

  const availabilityInfo = checkAvailability.data ?? null
  const pricingInfo = calculatePricing.data ?? null
  const isCheckingAvailability = Boolean(propertyId && selectedDates.from && selectedDates.to) &&
    (checkAvailability.isLoading || checkAvailability.isFetching)

  const resetDialog = () => {
    form.reset({
      property_id: externalPropertyId ?? 0,
      check_in_date: '',
      check_out_date: '',
      guests: 1,
      primary_guest_name: '',
      primary_guest_phone: '',
      primary_guest_email: '',
      special_requests: '',
    })
    setSelectedDates({ from: undefined, to: undefined })
    setPropertySearch('')
    if (!externalPropertyId) setSelectedPropertyId(undefined)
  }

  const onSubmit = async (data: CreateBookingFormValues) => {
    if (!propertyId || !selectedDates.from || !selectedDates.to) {
      toast({
        title: 'Missing details',
        description: 'Select a property and both check-in and check-out dates.',
        variant: 'destructive',
      })
      return
    }
    if (!availabilityInfo?.available) {
      toast({
        title: 'Unavailable',
        description: availabilityInfo?.reason || 'Property is not available for the selected dates.',
        variant: 'destructive',
      })
      return
    }
    try {
      await createBooking({
        ...data,
        property_id: propertyId,
        check_in_date: selectedDates.from.toISOString(),
        check_out_date: selectedDates.to.toISOString(),
      }).unwrap()
      toast({ title: 'Booking Created', description: 'Your booking has been created successfully.' })
      setIsOpen(false)
      resetDialog()
      onSuccess?.()
    } catch (error) {
      applyServerValidation(error, form.setError)
      toast({
        title: 'Booking Failed',
        description: getErrorMessage(error, 'Failed to create booking. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>Select dates and enter guest details for your booking</DialogDescription>
        </DialogHeader>
        {!externalPropertyId && (
          <div className="space-y-2 mb-4">
            <Label>Search Property</Label>
            <Input
              placeholder="Search by title or location..."
              value={propertySearch}
              onChange={(e) => {
                setPropertySearch(e.target.value)
                if (selectedPropertyId) setSelectedPropertyId(undefined)
              }}
            />
            {form.formState.errors.property_id && (
              <p className="text-sm text-destructive">{form.formState.errors.property_id.message}</p>
            )}
            {searchResults?.items && searchResults.items.length > 0 && !propertyId && (
              <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 max-h-40 overflow-y-auto backdrop-blur-md">
                {searchResults.items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm border-b border-cohere-card-border/60 last:border-b-0 transition-colors"
                    onClick={() => {
                      setSelectedPropertyId(p.id)
                      setPropertySearch(p.title)
                    }}
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground ml-2">{p.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {property && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <img
                  src={property.main_image_url || '/placeholder-property.jpg'}
                  alt={property.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.locality}
                  </p>
                  <p className="text-sm font-medium">{formatCurrency(property.base_price)}/night</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
          <FormRootError form={form} />
          <BookingDateSelection
            selectedDates={selectedDates}
            setSelectedDates={setSelectedDates}
            pricingInfo={pricingInfo}
            availabilityInfo={availabilityInfo}
          />
          {(form.formState.errors.check_in_date || form.formState.errors.check_out_date) && (
            <p className="text-sm text-destructive">
              {form.formState.errors.check_in_date?.message || form.formState.errors.check_out_date?.message}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guests">Number of Guests</Label>
              <Input
                id="guests"
                type="number"
                min={1}
                max={property?.max_occupancy || 10}
                {...form.register('guests', { valueAsNumber: true })}
              />
              {form.formState.errors.guests && (
                <FormMessage>{form.formState.errors.guests.message}</FormMessage>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_guest_name">Primary Guest Name</Label>
              <Input id="primary_guest_name" {...form.register('primary_guest_name')} placeholder="John Doe" />
              {form.formState.errors.primary_guest_name && (
                <FormMessage>{form.formState.errors.primary_guest_name.message}</FormMessage>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_guest_phone">Phone Number</Label>
              <Input id="primary_guest_phone" {...form.register('primary_guest_phone')} placeholder="+1234567890" />
              {form.formState.errors.primary_guest_phone && (
                <FormMessage>{form.formState.errors.primary_guest_phone.message}</FormMessage>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_guest_email">Email Address</Label>
              <Input
                id="primary_guest_email"
                type="email"
                {...form.register('primary_guest_email')}
                placeholder="john@example.com"
              />
              {form.formState.errors.primary_guest_email && (
                <FormMessage>{form.formState.errors.primary_guest_email.message}</FormMessage>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="special_requests">Special Requests (Optional)</Label>
            <Textarea
              id="special_requests"
              {...form.register('special_requests')}
              placeholder="Any special requirements or requests..."
              rows={3}
            />
            {form.formState.errors.special_requests && (
              <FormMessage>{form.formState.errors.special_requests.message}</FormMessage>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                isCreating ||
                isCheckingAvailability ||
                !propertyId ||
                !selectedDates.from ||
                !selectedDates.to ||
                !availabilityInfo?.available
              }
              className="flex-1"
            >
              {isCreating ? 'Creating…' : isCheckingAvailability ? 'Checking availability…' : 'Create Booking'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateBookingDialog }
