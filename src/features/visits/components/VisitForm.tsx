import { useScheduleVisitMutation } from '@/features/visits/api/visitsApi'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { useSearchPropertiesQuery } from '@/features/properties/api/propertiesApi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormRootError } from '@/components/ui/form-root-error'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import { visitFormSchema, type VisitFormValues } from '@/features/visits/validations'

const VisitForm = () => {
  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      property_id: 0,
      scheduled_date: '',
    },
  })
  const { toast } = useToast()
  const [scheduleVisit, createState] = useScheduleVisitMutation()
  const users = useGetUsersQuery({})
  const properties = useSearchPropertiesQuery({})
  const { control, handleSubmit } = form

  const onSubmit = async (values: VisitFormValues) => {
    form.clearErrors()
    try {
      const scheduledDate = localInputToServerTimestamp(values.scheduled_date)
      if (!scheduledDate) {
        form.setError('scheduled_date', { message: 'Enter a valid date and time' })
        return
      }
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
      <h1 className="text-xl font-semibold">Schedule Visit</h1>
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
              <FormField
                control={control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : undefined}
                      disabled={users.isFetching}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={users.isFetching ? "Loading users..." : "Select user"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.data?.items?.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name || u.phone || `User ${u.id}`}
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
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : undefined}
                      disabled={properties.isFetching}
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
              <Button type="submit" disabled={createState.isLoading}>
                {createState.isLoading ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default VisitForm
