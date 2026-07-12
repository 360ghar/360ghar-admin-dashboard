import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RentChargeGenerateRequest } from "@/types/pm";
import {
  useGenerateRentChargesMutation,
  useListPmLeasesQuery,
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
import { Plus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmChargeGenerateSchema, type PmChargeGenerateForm } from "@/features/pm/validations";

interface GenerateChargesDialogProps {
  ownerId: number | null;
}

export default function GenerateChargesDialog({
  ownerId,
}: GenerateChargesDialogProps) {
  const { role } = useUserRole();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [generateCharges, generateState] = useGenerateRentChargesMutation();

  const leases = useListPmLeasesQuery(
    { owner_id: ownerId, status: "active", limit: 200 },
    { skip: role === "agent" && !ownerId },
  );

  const form = useForm<PmChargeGenerateForm>({
    resolver: zodResolver(pmChargeGenerateSchema),
    defaultValues: {
      scope: "owner",
      lease_id: "",
      start_month: "",
      months: "1",
    },
  });

  const scope = form.watch("scope");

  const onSubmit = async (values: PmChargeGenerateForm) => {
    const payload: RentChargeGenerateRequest = {
      owner_id: values.scope === "owner" ? ownerId || undefined : undefined,
      lease_id: values.scope === "lease" ? Number(values.lease_id) : undefined,
      start_month: values.start_month || undefined,
      months: Number(values.months),
    };
    try {
      const res = await generateCharges(payload).unwrap();
      toast({ title: "Generated", description: `Created ${res.created}, skipped ${res.skipped}.` });
      form.reset();
      setOpen(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({ title: "Failed", description: getErrorMessage(e, "Could not generate charges."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Generate charges
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate rent charges</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner (all active leases)</SelectItem>
                      <SelectItem value="lease">Specific lease</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {scope === "lease" && (
              <FormField
                control={form.control}
                name="lease_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lease</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lease…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leases.isLoading ? (
                          <SelectItem value="loading" disabled>Loading leases…</SelectItem>
                        ) : leases.isError ? (
                          <SelectItem value="error" disabled>Failed to load leases</SelectItem>
                        ) : !(leases.data?.items?.length) ? (
                          <SelectItem value="none" disabled>No active leases</SelectItem>
                        ) : (
                          (leases.data?.items ?? []).map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              #{l.id} • Property #{l.property_id}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start month</FormLabel>
                    <FormControl><Input type="month" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Select the start month for charge generation.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Months</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generateState.isLoading || (scope === "lease" && !form.getValues("lease_id"))}
              >
                {generateState.isLoading ? "Generating…" : "Generate"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
