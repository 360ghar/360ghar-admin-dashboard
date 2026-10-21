import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePmPropertyMutation } from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmPropertyFormSchema } from "@/features/pm/validations";
import PropertyFormFields from "@/features/pm/components/PropertyFormFields";
import { buildCreateBody, emptyPropertyValues, type PropertyFormValues } from "@/features/pm/propertyForm";

interface PropertyCreateDialogProps {
  ownerId: number | null;
  disabled: boolean;
}

export default function PropertyCreateDialog({
  ownerId,
  disabled,
}: PropertyCreateDialogProps) {
  const { toast } = useToast();
  const { role } = useUserRole();
  const [createProperty, createState] = useCreatePmPropertyMutation();
  const [open, setOpen] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(pmPropertyFormSchema("create")),
    defaultValues: emptyPropertyValues(),
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) form.reset(emptyPropertyValues());
    },
    [form],
  );

  const onSubmit = async (values: PropertyFormValues) => {
    if (!ownerId) {
      toast({
        title: "Select an owner",
        description: "Choose an owner from the top bar.",
        variant: "destructive",
      });
      return;
    }

    form.clearErrors();
    try {
      // One request: the owner, status, due day, grace period and late fee policy are body fields.
      await createProperty(buildCreateBody(values, ownerId)).unwrap();
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create managed property</DialogTitle>
          <DialogDescription className="sr-only">Enter the listing details and the management terms of the new property.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            <FormRootError form={form} />
            <PropertyFormFields form={form} mode="create" hideOwnerContact={role !== "admin"} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createState.isLoading}>
                {createState.isLoading ? "Creating…" : "Create"}
              </Button>
            </div>
            {disabled && (
              <div className="text-sm text-muted-foreground">
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
