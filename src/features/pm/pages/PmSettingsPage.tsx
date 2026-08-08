import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings } from 'lucide-react'
import OwnerScopeGate from '@/features/pm/components/OwnerScopeGate'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { selectSelectedOwnerId } from '@/features/pm/slices/pmSlice'
import { useGetPmSettingsQuery, useUpdatePmSettingsMutation } from '@/features/pm/api/pmApi'
import { pmSettingsSchema, type PmSettingsForm } from '@/features/pm/validations'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { getErrorMessage } from '@/lib/errors'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'

const DEFAULTS: PmSettingsForm = {
  payment_due_day: 1,
  grace_period_days: 5,
  late_fee_enabled: false,
  late_fee_flat: 0,
  late_fee_percent: 0,
  auto_generate_charges: true,
  notify_owner_on_payment: true,
  notify_tenant_on_charge: false,
  default_lease_term_months: 11,
}

export default function PmSettingsPage() {
  const { role } = useUserRole()
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId)
  const ownerId = selectedOwnerId
  const { toast } = useToast()

  const settings = useGetPmSettingsQuery(
    { owner_id: ownerId },
    { skip: role === 'agent' && !ownerId },
  )
  const [updateSettings, updateState] = useUpdatePmSettingsMutation()

  const form = useForm<PmSettingsForm>({
    resolver: zodResolver(pmSettingsSchema),
    defaultValues: DEFAULTS,
  })

  const { reset, formState } = form

  useEffect(() => {
    if (settings.data) {
      reset({
        payment_due_day: settings.data.payment_due_day ?? DEFAULTS.payment_due_day,
        grace_period_days: settings.data.grace_period_days ?? DEFAULTS.grace_period_days,
        late_fee_enabled: settings.data.late_fee_enabled ?? DEFAULTS.late_fee_enabled,
        late_fee_flat: settings.data.late_fee_flat ?? DEFAULTS.late_fee_flat,
        late_fee_percent: settings.data.late_fee_percent ?? DEFAULTS.late_fee_percent,
        auto_generate_charges: settings.data.auto_generate_charges ?? DEFAULTS.auto_generate_charges,
        notify_owner_on_payment: settings.data.notify_owner_on_payment ?? DEFAULTS.notify_owner_on_payment,
        notify_tenant_on_charge: settings.data.notify_tenant_on_charge ?? DEFAULTS.notify_tenant_on_charge,
        default_lease_term_months: settings.data.default_lease_term_months ?? DEFAULTS.default_lease_term_months,
      })
    }
  }, [settings.data, reset])

  const onSubmit = async (values: PmSettingsForm) => {
    try {
      await updateSettings({ owner_id: ownerId, payload: values }).unwrap()
      toast({ title: 'Saved', description: 'PM settings updated successfully.' })
    } catch (e: unknown) {
      applyServerValidation(e, form.setError)
      toast({ title: 'Save failed', description: getErrorMessage(e, 'Please check inputs'), variant: 'destructive' })
    }
  }

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Configure billing defaults, automation, and notification preferences for this portfolio."
          icon={Settings}
          badge="PM"
        />

        {settings.isError ? (
          <ErrorState title="Couldn't load settings" error={settings.error} onRetry={() => void settings.refetch()} />
        ) : settings.isLoading ? (
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
              <FormRootError form={form} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Billing Defaults</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="payment_due_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment due day</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={28} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormDescription>Day of the month (1-28) rent is due.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grace_period_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grace period (days)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={30} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormDescription>Days after due date before a charge is marked overdue.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="default_lease_term_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default lease term (months)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={60} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormDescription>Pre-filled term for new leases.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Late Fees</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="late_fee_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-4">
                        <div className="space-y-1">
                          <FormLabel>Enable late fees</FormLabel>
                          <FormDescription>Apply a late fee once the grace period ends.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="late_fee_flat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late fee flat (INR)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="late_fee_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late fee percent (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={100} step="0.01" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Automation & Notifications</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="auto_generate_charges"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-4">
                        <div className="space-y-1">
                          <FormLabel>Auto-generate rent charges</FormLabel>
                          <FormDescription>Create monthly charges automatically.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notify_owner_on_payment"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-4">
                        <div className="space-y-1">
                          <FormLabel>Notify owner on payment</FormLabel>
                          <FormDescription>Email the owner when a payment is recorded.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notify_tenant_on_charge"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-4">
                        <div className="space-y-1">
                          <FormLabel>Notify tenant on charge</FormLabel>
                          <FormDescription>Notify the tenant when a charge is generated.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateState.isLoading || !formState.isDirty}>
                  {updateState.isLoading ? 'Saving…' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </OwnerScopeGate>
  )
}
