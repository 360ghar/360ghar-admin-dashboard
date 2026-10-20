import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePmLeaseMutation } from "@/features/pm/api/pmApi";
import { PmPropertyPicker } from "@/features/pm/components/PmPropertyPicker";
import type { PmProperty } from "@/types/pm";
import { LEASE_STATUSES } from "@/features/pm/constants";
import { parseLateFeePolicy } from "@/features/pm/propertyForm";
import { buildLeaseCreate } from "@/features/pm/leaseForm";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmLeaseCreateSchema, type PmLeaseCreateForm } from "@/features/pm/validations";

interface CreateLeaseDialogProps {
  ownerId: number | null;
}

export default function CreateLeaseDialog({ ownerId }: CreateLeaseDialogProps) {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [createLease, createState] = useCreatePmLeaseMutation();

  const [open, setOpen] = useState(false);

  // The picked property: its settings are the lease defaults, and its owner owns the lease.
  const [selectedProperty, setSelectedProperty] = useState<PmProperty | null>(null);

  const form = useForm<PmLeaseCreateForm>({
    resolver: zodResolver(pmLeaseCreateSchema),
    defaultValues: {
      property_id: "",
      tenant_name: "",
      tenant_phone: "",
      tenant_email: "",
      status: "draft",
      start_date: "",
      end_date: "",
      monthly_rent: "",
      security_deposit: "",
      payment_due_day: "",
      grace_period_days: "",
      late_fee_amount: "",
      late_fee_percentage: "",
    },
  });

  // The lease is what billing reads: due day, grace period and late fee. A blank due day or grace period
  // takes the property's settings (the backend copies them). The property's late fee policy is not read
  // by billing, so it is copied into the lease fields here, where the owner can still change it.
  const prefilledFor = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedProperty || prefilledFor.current === selectedProperty.id) return;
    prefilledFor.current = selectedProperty.id;
    const fee = parseLateFeePolicy(selectedProperty.late_fee_policy);
    form.setValue("late_fee_amount", fee.type === "fixed" ? fee.amount : "");
    form.setValue("late_fee_percentage", fee.type === "percentage" ? fee.percent : "");
  }, [selectedProperty, form]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        form.reset();
        setSelectedProperty(null);
        prefilledFor.current = null;
      }
    },
    [form],
  );

  const onSubmit = async (values: PmLeaseCreateForm) => {
    const payload = buildLeaseCreate(values, ownerId ?? selectedProperty?.owner_id ?? undefined);
    try {
      await createLease(payload).unwrap();
      toast({ title: "Created", description: "Lease created." });
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({ title: "Failed", description: getErrorMessage(e, "Could not create lease."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Lease
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create lease</DialogTitle>
          <DialogDescription className="sr-only">Enter the lease terms for a managed property.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><FormRootError form={form} /></div>
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Property</FormLabel>
                  <PmPropertyPicker
                    ownerId={ownerId}
                    enabled={open && !(role === "agent" && !ownerId)}
                    selected={selectedProperty}
                    onSelect={(property) => {
                      setSelectedProperty(property);
                      field.onChange(property ? String(property.id) : "");
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEASE_STATUSES.filter((s) =>
                        ["draft", "pending_signature", "active"].includes(s.value),
                      ).map((s) => (
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
              name="tenant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant name</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenant_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant phone</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tenant_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant email</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_rent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly rent</FormLabel>
                  <FormControl><Input placeholder="e.g. 25000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="security_deposit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security deposit</FormLabel>
                  <FormControl><Input placeholder="e.g. 50000 (0 for none)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_due_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment due day (1-28)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      placeholder={selectedProperty ? `Property default: ${selectedProperty.payment_due_day ?? 1}` : "Property default"}
                      {...field}
                    />
                  </FormControl>
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
                    <Input
                      type="number"
                      min={0}
                      placeholder={selectedProperty ? `Property default: ${selectedProperty.grace_period_days ?? 5}` : "Property default"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="late_fee_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late fee, fixed amount (₹)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="None" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="late_fee_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late fee, percent of rent</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} step="0.1" placeholder="None" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground md:col-span-2">
              The fee is charged once, after the grace period, on a charge that is still unpaid. A fixed amount is
              charged instead of the percentage when both are set.
            </p>
            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createState.isLoading}>
                {createState.isLoading ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
