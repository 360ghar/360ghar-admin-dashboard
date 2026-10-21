import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MANAGED_PROPERTY_STATUSES, VALIDATION } from "@/features/pm/constants";
import type { PropertyFormValues } from "@/features/pm/propertyForm";

interface PropertyTermsFieldsProps {
  form: UseFormReturn<PropertyFormValues>;
}

/**
 * The PM terms of a managed property: status, due day, grace period and late fee policy.
 * Billing reads the lease, not the property. These are the defaults a new lease starts from:
 * the backend copies the due day and grace period into a lease that does not set its own, and the
 * lease form copies the late fee. Each lease can then change them.
 */
export default function PropertyTermsFields({ form }: PropertyTermsFieldsProps) {
  const lateFeeType = form.watch("late_fee_type");
  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold">Management terms</legend>
      <p className="text-xs text-muted-foreground md:col-span-2">
        Due day, grace period and late fee are the defaults for new leases. Each lease keeps its own values, and
        billing uses the lease.
      </p>
      <FormField
        control={form.control}
        name="management_status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Management status</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {MANAGED_PROPERTY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="payment_due_day"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment due day ({VALIDATION.PAYMENT_DUE_DAY_MIN}-{VALIDATION.PAYMENT_DUE_DAY_MAX})</FormLabel>
            <FormControl><Input type="number" min={VALIDATION.PAYMENT_DUE_DAY_MIN} max={VALIDATION.PAYMENT_DUE_DAY_MAX} {...field} /></FormControl>
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
            <FormControl><Input type="number" min={0} max={VALIDATION.GRACE_PERIOD_DAYS_MAX} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="late_fee_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Late fee</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fixed">Fixed amount</SelectItem>
                <SelectItem value="percentage">Percentage of rent</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {lateFeeType === "fixed" ? (
        <FormField
          control={form.control}
          name="late_fee_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fixed amount (₹)</FormLabel>
              <FormControl><Input type="number" min={0} step="0.01" placeholder="e.g. 500" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      {lateFeeType === "percentage" ? (
        <FormField
          control={form.control}
          name="late_fee_percent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Percent of monthly rent</FormLabel>
              <FormControl><Input type="number" min={0} max={100} step="0.1" placeholder="e.g. 2" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </fieldset>
  );
}
