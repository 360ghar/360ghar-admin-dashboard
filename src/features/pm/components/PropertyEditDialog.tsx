import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PmProperty } from "@/types/pm";
import { useUpdatePmPropertyMutation } from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FormRootError } from "@/components/ui/form-root-error";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { pmPropertyFormSchema } from "@/features/pm/validations";
import PropertyFormFields from "@/features/pm/components/PropertyFormFields";
import { buildUpdateBody, valuesFromProperty, type PropertyFormValues } from "@/features/pm/propertyForm";

interface PropertyEditDialogProps {
  property: PmProperty | undefined;
}

export function PropertyEditDialog({ property }: PropertyEditDialogProps) {
  const { toast } = useToast();
  const { role } = useUserRole();
  const [updatePmProperty, updateState] = useUpdatePmPropertyMutation();
  const [open, setOpen] = useState(false);

  // The values the form opened with. The PATCH carries only the fields that differ from them.
  const initial = useMemo(() => (property ? valuesFromProperty(property) : null), [property]);

  // Only a changed field is validated: an unchanged one is not sent, and old stored data may break a rule.
  const resolver = useMemo(() => zodResolver(pmPropertyFormSchema("edit", initial ?? undefined)), [initial]);
  const form = useForm<PropertyFormValues>({
    resolver,
    values: initial ?? undefined,
  });

  const submit = async (values: PropertyFormValues) => {
    if (!property || !initial) return;
    const payload = buildUpdateBody(values, initial);
    if (Object.keys(payload).length === 0) {
      toast({ title: "No changes", description: "Nothing was changed." });
      setOpen(false);
      return;
    }
    form.clearErrors();
    try {
      await updatePmProperty({ property_id: property.id, payload }).unwrap();
      toast({ title: "Updated", description: "Property updated." });
      setOpen(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({ title: "Failed", description: getErrorMessage(e, "Could not update property."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!property} className="rounded-cohere-pill">
          <Settings2 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit managed property</DialogTitle>
          <DialogDescription className="sr-only">Change the listing details and the management terms. Only changed fields are saved.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={(e) => void form.handleSubmit(submit)(e)} className="space-y-6">
            <FormRootError form={form} />
            <PropertyFormFields form={form} mode="edit" hideOwnerContact={role !== "admin"} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateState.isLoading}>
                {updateState.isLoading ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
