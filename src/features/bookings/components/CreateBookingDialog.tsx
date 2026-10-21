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
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useGetPropertyQuery, useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { Plus } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { createBookingSchema, type CreateBookingFormValues } from '@/features/bookings/validations'
import BookingDateSelection from './parts/BookingDateSelection'

const CreateBookingDialog: React.FC<{ propertyId?: number; onSuccess?: () => void }> = ({ propertyId: externalPropertyId, onSuccess }) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  // Staff book for a guest they pick. A guest user always books for themselves (the API ignores user_id).
  const { isUser } = useUserRole()
  const isStaff = !isUser
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(externalPropertyId)
  const [propertySearch, setPropertySearch] = useState('')
  // Staff book on behalf of a guest: the guest owns the booking (`user_id`). Without it the booking would belong to the staff account.
  const [guestSearch, setGuestSearch] = useState('')
  const [guestUser, setGuestUser] = useState<{ id: number; label: string } | null>(null)
  const debouncedGuestSearch = useDebounce(guestSearch.trim(), 300)
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })

  const propertyId = selectedPropertyId ?? externalPropertyId
  const { currentData: searchResults, error: searchError, refetch: refetchSearch } = useSearchPropertiesQuery(
    { q: propertySearch, limit: 10 },
    { skip: !isOpen || !!externalPropertyId || propertySearch.length < 2 },
  )
  const { currentData: guestResults, error: guestSearchError, refetch: refetchGuestSearch } = useGetUsersQuery(
    { q: debouncedGuestSearch, limit: 10 },
    { skip: !isOpen || guestUser !== null || debouncedGuestSearch.length < 2 },
  )
  const { currentData: property, error: propertyError, refetch: refetchProperty } = useGetPropertyQuery(propertyId || 0, { skip: !propertyId || !isOpen })

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

  // Guest-count check: `{ property_id, guests }` only. The route rejects dates.
  const occupancyArgs = isOpen && propertyId ? { property_id: propertyId, guests: guestsCount } : skipToken
  // Pricing needs the dates. An error (no rate, bad range) comes back as a 4xx envelope.
  const pricingArgs =
    propertyId && selectedDates.from && selectedDates.to
      ? {
          property_id: propertyId,
          check_in_date: selectedDates.from.toISOString(),
          check_out_date: selectedDates.to.toISOString(),
          guests: guestsCount,
        }
      : skipToken

  const checkAvailability = useCheckAvailabilityQuery(occupancyArgs)
  const calculatePricing = useCalculatePricingQuery(pricingArgs)
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation()

  const availabilityInfo = checkAvailability.currentData ?? null
  const pricingInfo = calculatePricing.currentData ?? null
  // A price is usable only when the response carries a total. A failed or empty answer disables Create.
  const hasPrice = pricingInfo != null && typeof pricingInfo.total_amount === 'number'
  const isCheckingAvailability = Boolean(propertyId) &&
    (checkAvailability.isLoading || checkAvailability.isFetching)
  const isPricing = Boolean(propertyId && selectedDates.from && selectedDates.to) &&
    (calculatePricing.isLoading || calculatePricing.isFetching)

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
    setGuestSearch('')
    setGuestUser(null)
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
    if (isStaff && !guestUser) {
      toast({ title: 'Guest required', description: 'Select the guest this booking is for.', variant: 'destructive' })
      return
    }
    if (checkAvailability.error) {
      toast({ title: 'Availability check failed', description: getErrorMessage(checkAvailability.error, 'Retry the availability check before creating a booking.'), variant: 'destructive' })
      return
    }
    if (!availabilityInfo?.occupancy_ok) {
      toast({
        title: 'Guest count does not fit',
        description: availabilityInfo?.reason || 'The guest count does not fit this property.',
        variant: 'destructive',
      })
      return
    }
    if (calculatePricing.error || !hasPrice) {
      toast({
        title: 'No price for these dates',
        description: calculatePricing.error ? getErrorMessage(calculatePricing.error, 'Pricing is not available.') : 'Pricing is not available yet.',
        variant: 'destructive',
      })
      return
    }
    try {
      await createBooking({
        ...data,
        special_requests: data.special_requests?.trim() ? data.special_requests : undefined,
        ...(guestUser ? { user_id: guestUser.id } : {}),
        property_id: propertyId,
        check_in_date: selectedDates.from.toISOString(),
        check_out_date: selectedDates.to.toISOString(),
      }).unwrap()
      toast({ title: 'Booking Created', description: 'The booking has been created for the selected guest.' })
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
          <DialogDescription>Choose the guest, pick the dates and confirm the price</DialogDescription>
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
            {searchError && (
              <p role="alert" className="text-sm text-destructive">
                Could not search properties. <Button type="button" variant="link" size="sm" onClick={() => { void refetchSearch() }}>Retry</Button>
              </p>
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
        {isStaff && <div className="space-y-2 mb-4">
          <Label>Guest</Label>
          {guestUser ? (
            <div className="flex items-center justify-between rounded-cohere-md border border-cohere-card-border bg-card/40 px-3 py-2 text-sm">
              <span className="font-medium">{guestUser.label}</span>
              <Button type="button" variant="link" size="sm" onClick={() => { setGuestUser(null); setGuestSearch('') }}>Change</Button>
            </div>
          ) : (
            <>
              <Input placeholder="Search guest by name, phone or email..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} />
              {guestSearchError && (
                <p role="alert" className="text-sm text-destructive">
                  Could not search users. <Button type="button" variant="link" size="sm" onClick={() => { void refetchGuestSearch() }}>Retry</Button>
                </p>
              )}
              {guestResults?.items && guestResults.items.length > 0 && (
                <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 max-h-40 overflow-y-auto backdrop-blur-md">
                  {guestResults.items.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm border-b border-cohere-card-border/60 last:border-b-0 transition-colors"
                      onClick={() => {
                        const label = u.full_name || u.phone || u.email || `User #${u.id}`
                        setGuestUser({ id: u.id, label })
                        // Prefill the contact fields the booking needs, without overwriting what staff typed.
                        if (!form.getValues('primary_guest_name') && u.full_name) form.setValue('primary_guest_name', u.full_name, { shouldValidate: true })
                        if (!form.getValues('primary_guest_phone') && u.phone) form.setValue('primary_guest_phone', u.phone, { shouldValidate: true })
                        if (!form.getValues('primary_guest_email') && u.email) form.setValue('primary_guest_email', u.email, { shouldValidate: true })
                      }}
                    >
                      <span className="font-medium">{u.full_name || `User #${u.id}`}</span>
                      <span className="text-muted-foreground ml-2">{u.phone || u.email || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>}
        {propertyError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load the selected property. <Button type="button" variant="link" size="sm" onClick={() => { void refetchProperty() }}>Retry</Button>
          </p>
        )}
        {property && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex gap-4">
                <img
                  src={property.main_image_url ?? '/placeholder-property.jpg'}
                  alt={property.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.locality}
                  </p>
                  <p className="text-sm font-medium">
                    {property.nightly_rate != null
                      ? `${formatCurrency(property.nightly_rate)}/night`
                      : 'No nightly rate set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
          <FormRootError form={form} />
          {checkAvailability.error && (
            <p role="alert" className="text-sm text-destructive">
              Could not check availability: {getErrorMessage(checkAvailability.error, 'try again')}. <Button type="button" variant="link" size="sm" onClick={() => { void checkAvailability.refetch() }}>Retry</Button>
            </p>
          )}
          {calculatePricing.error && (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(calculatePricing.error, 'Could not calculate pricing.')} <Button type="button" variant="link" size="sm" onClick={() => { void calculatePricing.refetch() }}>Retry</Button>
            </p>
          )}
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
                isPricing ||
                Boolean(checkAvailability.error) ||
                Boolean(calculatePricing.error) ||
                Boolean(propertyError) ||
                (isStaff && !guestUser) ||
                !propertyId ||
                !selectedDates.from ||
                !selectedDates.to ||
                !availabilityInfo?.occupancy_ok ||
                !hasPrice
              }
              className="flex-1"
            >
              {isCreating ? 'Creating…' : isCheckingAvailability || isPricing ? 'Checking price…' : 'Create Booking'}
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
