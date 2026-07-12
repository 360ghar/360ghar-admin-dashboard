import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PmPropertyCreate } from "@/types/pm";
import {
  useCreatePmPropertyMutation,
  useUpdatePmPropertyMutation,
} from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmPropertyCreateSchema, type PmPropertyCreateForm } from "@/features/pm/validations";

interface PropertyCreateDialogProps {
  ownerId: number | null;
  disabled: boolean;
}

export default function PropertyCreateDialog({
  ownerId,
  disabled,
}: PropertyCreateDialogProps) {
  const { toast } = useToast();
  const [createProperty, createState] = useCreatePmPropertyMutation();
  const [updateProperty, updateState] = useUpdatePmPropertyMutation();
  const [open, setOpen] = useState(false);

  const form = useForm<PmPropertyCreateForm>({
    resolver: zodResolver(pmPropertyCreateSchema),
    defaultValues: {
      title: "",
      property_type: "apartment",
      purpose: "rent",
      base_price: "",
      city: "",
      locality: "",
      full_address: "",
      management_status: "active",
      payment_due_day: "1",
      grace_days: "5",
      late_fee_policy_json: '{"type":"fixed","amount":0}',
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) form.reset();
    },
    [form],
  );

  const onSubmit = async (values: PmPropertyCreateForm) => {
    if (!ownerId) {
      toast({
        title: "Select an owner",
        description: "Choose an owner from the top bar.",
        variant: "destructive",
      });
      return;
    }

    let lateFeePolicy: Record<string, unknown> | undefined;
    try {
      lateFeePolicy = values.late_fee_policy_json
        ? (JSON.parse(values.late_fee_policy_json) as Record<string, unknown>)
        : undefined;
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Late fee policy contains invalid JSON. Please correct it.',
        variant: 'destructive',
      })
      return;
    }

    const data: PmPropertyCreate = {
      title: values.title,
      property_type: values.property_type,
      purpose: values.purpose,
      base_price: Number(values.base_price),
      city: values.city || undefined,
      locality: values.locality || undefined,
      full_address: values.full_address || undefined,
      monthly_rent: values.purpose === "rent" ? Number(values.base_price) : undefined,
    };

    try {
      const created = await createProperty({
        data,
        owner_id: ownerId,
        management_status: values.management_status,
        payment_due_day: Number(values.payment_due_day),
        grace_period_days: Number(values.grace_days),
      }).unwrap();
      try {
        await updateProperty({
          property_id: created.id,
          payload: { late_fee_policy: lateFeePolicy },
        }).unwrap();
      } catch {
        toast({
          title: "Partial success",
          description: "Property created, but late fee policy could not be saved. Please update it manually.",
          variant: "destructive",
        });
        handleOpenChange(false);
        return;
      }
      toast({ title: "Created", description: "Managed property created." });
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({
        title: "Failed",
        description: getErrorMessage(e, "Could not create property."),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Create</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create managed property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><FormRootError form={form} /></div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. 2BHK in Indiranagar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="house">house</SelectItem>
                      <SelectItem value="apartment">apartment</SelectItem>
                      <SelectItem value="builder_floor">builder_floor</SelectItem>
                      <SelectItem value="room">room</SelectItem>
                      <SelectItem value="villa">villa</SelectItem>
                      <SelectItem value="plot">plot</SelectItem>
                      <SelectItem value="condo">condo</SelectItem>
                      <SelectItem value="penthouse">penthouse</SelectItem>
                      <SelectItem value="studio">studio</SelectItem>
                      <SelectItem value="loft">loft</SelectItem>
                      <SelectItem value="pg">pg</SelectItem>
                      <SelectItem value="flatmate">flatmate</SelectItem>
                      <SelectItem value="office">office</SelectItem>
                      <SelectItem value="shop">shop</SelectItem>
                      <SelectItem value="warehouse">warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rent">rent</SelectItem>
                      <SelectItem value="buy">buy</SelectItem>
                      <SelectItem value="short_stay">short_stay</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base price (₹)</FormLabel>
                  <FormControl><Input placeholder="e.g. 25000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locality (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Full address (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <SelectItem value="draft">draft</SelectItem>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="archived">archived</SelectItem>
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
                  <FormLabel>Payment due day (1-28)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grace_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grace period days</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="late_fee_policy_json"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Late fee policy (JSON)</FormLabel>
                  <FormControl><Textarea rows={6} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
                {createState.isLoading ? "Creating…" : "Create"}
              </Button>
            </div>
            {disabled && (
              <div className="text-sm text-muted-foreground md:col-span-2">
                Select an owner from the top bar to create a managed
                property in the correct portfolio.
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
