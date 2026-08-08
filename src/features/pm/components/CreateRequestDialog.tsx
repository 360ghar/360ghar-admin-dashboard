import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { MaintenanceRequestCreate } from "@/types/pm";
import { useCreateMaintenanceRequestMutation } from "@/features/pm/api/pmApi";
import { usePmPropertyOptions } from "@/features/pm/hooks/usePmPropertyOptions";
import { PmPropertySelectItems } from "@/features/pm/components/PmPropertySelectItems";
import { MAINTENANCE_CATEGORIES, MAINTENANCE_URGENCIES } from "@/features/pm/constants";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmMaintenanceRequestSchema, type PmMaintenanceRequestForm } from "@/features/pm/validations";

interface CreateRequestDialogProps {
  ownerId: number | null;
}

export default function CreateRequestDialog({ ownerId }: CreateRequestDialogProps) {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [createRequest, createState] = useCreateMaintenanceRequestMutation();

  const [open, setOpen] = useState(false);

  const properties = usePmPropertyOptions(ownerId, { enabled: open && !(role === "agent" && !ownerId) });

  const form = useForm<PmMaintenanceRequestForm>({
    resolver: zodResolver(pmMaintenanceRequestSchema),
    defaultValues: {
      property_id: "",
      category: "plumbing",
      urgency: "medium",
      title: "",
      description: "",
      preferred_contact_method: "",
      availability_notes: "",
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) form.reset();
    },
    [form],
  );

  const onSubmit = async (values: PmMaintenanceRequestForm) => {
    const payload: MaintenanceRequestCreate = {
      property_id: Number(values.property_id),
      category: values.category,
      urgency: values.urgency,
      title: values.title,
      description: values.description || undefined,
      preferred_contact_method: values.preferred_contact_method || undefined,
      availability_notes: values.availability_notes || undefined,
    };
    try {
      await createRequest(payload).unwrap();
      toast({ title: "Created", description: "Maintenance request created." });
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({ title: "Failed", description: getErrorMessage(e, "Could not create request."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create maintenance request</DialogTitle>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAINTENANCE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAINTENANCE_URGENCIES.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferred_contact_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred contact (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availability_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Availability notes (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
