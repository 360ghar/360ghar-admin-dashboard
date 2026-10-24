import { useScheduleVisitMutation } from '@/features/visits/api/visitsApi'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { useDebounce } from '@/hooks/useDebounce'
import { useState } from 'react'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormRootError } from '@/components/ui/form-root-error'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import { visitFormSchema, type VisitFormValues } from '@/features/visits/validations'
import { CalendarClock } from 'lucide-react'
import FadeContent from '@/components/reactbits/FadeContent'

const VisitForm = () => {
  const form = useForm<z.input<typeof visitFormSchema>, unknown, VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      property_id: 0,
      scheduled_date: '',
    },
  })
  const { toast } = useToast()
  const [scheduleVisit, createState] = useScheduleVisitMutation()
  // Both pickers search on the server: a list of the first 20 rows would hide most users and properties.
  const [userSearch, setUserSearch] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const debouncedUserSearch = useDebounce(userSearch.trim(), 300)
  const debouncedPropertySearch = useDebounce(propertySearch.trim(), 300)
  const users = useGetUsersQuery({ limit: 20, q: debouncedUserSearch || undefined })
  const properties = useSearchPropertiesQuery({ limit: 20, q: debouncedPropertySearch || undefined })
  const { control, handleSubmit } = form

  const onSubmit = async (values: VisitFormValues) => {
    form.clearErrors()
    try {
      const scheduledDate = localInputToServerTimestamp(values.scheduled_date)
      if (!scheduledDate) {
        form.setError('scheduled_date', { message: 'Enter a valid date and time' })
        return
      }
      // `user_id` is the visitor. The backend honours it for admins and agents.
      await scheduleVisit({
        property_id: values.property_id,
        user_id: values.user_id,
        scheduled_date: scheduledDate,
      }).unwrap()
      toast({ title: 'Scheduled', description: 'Visit scheduled' })
      form.reset()
    } catch (err: unknown) {
      applyServerValidation(err, form.setError)
      toast({ title: 'Failed', description: getErrorMessage(err, 'Please try again'), variant: 'destructive' })
    }
  }

  const errorMessage = createState.error ? getErrorMessage(createState.error, 'Something went wrong') : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule Visit"
        description="Book a visit for a user at a property"
        icon={CalendarClock}
      />
      <FadeContent container="#main-content" threshold={0} duration={600}>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Failed to schedule visit</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
                <FormRootError form={form} />
                {users.error && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not load users</AlertTitle>
                    <AlertDescription>
                      Select Retry to load users. <Button type="button" variant="link" size="sm" onClick={() => { void users.refetch() }}>Retry</Button>
                    </AlertDescription>
                  </Alert>
                )}
                {properties.error && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not load properties</AlertTitle>
                    <AlertDescription>
                      Select Retry to load properties. <Button type="button" variant="link" size="sm" onClick={() => { void properties.refetch() }}>Retry</Button>
                    </AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Input
                        aria-label="Search users"
                        placeholder="Search users by name, phone or email"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : undefined}
                        disabled={users.isFetching || Boolean(users.error)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={users.isFetching ? "Loading users..." : "Select user"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.data?.items?.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.full_name || u.phone || u.email || `User ${u.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Input
                        aria-label="Search properties"
                        placeholder="Search properties by title or location"
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                      />
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : undefined}
                        disabled={properties.isFetching || Boolean(properties.error)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={properties.isFetching ? "Loading properties..." : "Select property"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.data?.items?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!properties.isFetching && !properties.error && properties.data?.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No properties are available for a visit.</p>
                )}
                <FormField
                  control={control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Status is server-managed for scheduling; removed from form */}
                <Button type="submit" disabled={createState.isLoading || Boolean(properties.error) || properties.data?.items.length === 0}>
                  {createState.isLoading ? 'Scheduling...' : 'Schedule Visit'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </FadeContent>
    </div>
  )
}

export default VisitForm
