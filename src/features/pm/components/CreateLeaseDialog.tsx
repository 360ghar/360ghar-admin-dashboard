import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { LeaseCreate } from "@/types/pm";
import { useCreatePmLeaseMutation } from "@/features/pm/api/pmApi";
import { usePmPropertyOptions } from "@/features/pm/hooks/usePmPropertyOptions";
import { PmPropertySelectItems } from "@/features/pm/components/PmPropertySelectItems";
import { LEASE_STATUSES } from "@/features/pm/constants";
import { useUserRole } from "@/hooks/useUserRole";
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

  const properties = usePmPropertyOptions(ownerId, { enabled: open && !(role === "agent" && !ownerId) });

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
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) form.reset();
    },
    [form],
  );

  const onSubmit = async (values: PmLeaseCreateForm) => {
    const selectedPropertyOwnerId = (properties.data?.items ?? []).find(
      (p) => String(p.id) === values.property_id,
    )?.owner_id;

    const payload: LeaseCreate = {
      owner_id: ownerId ?? selectedPropertyOwnerId ?? undefined,
      property_id: Number(values.property_id),
      tenant_name: values.tenant_name || undefined,
      tenant_phone: values.tenant_phone || undefined,
      tenant_email: values.tenant_email || undefined,
      status: values.status,
      start_date: values.start_date,
      end_date: values.end_date,
      monthly_rent: Number(values.monthly_rent),
      security_deposit: Number(values.security_deposit),
    };
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create lease</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><FormRootError form={form} /></div>
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Property</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <PmPropertySelectItems properties={properties} />
                    </SelectContent>
                  </Select>
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
                  <FormControl><Input placeholder="e.g. 50000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
