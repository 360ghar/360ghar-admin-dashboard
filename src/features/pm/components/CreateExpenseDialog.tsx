import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DocumentType, ExpenseCreate } from "@/types/pm";
import {
  useCreatePmExpenseMutation,
  useUploadPmDocumentMutation,
} from "@/features/pm/api/pmApi";
import { usePmPropertyOptions } from "@/features/pm/hooks/usePmPropertyOptions";
import { PmPropertySelectItems } from "@/features/pm/components/PmPropertySelectItems";
import { EXPENSE_CATEGORIES } from "@/features/pm/constants";
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
import { Label } from "@/components/ui/label";
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
import { validateFileSize } from "@/lib/fileValidation";
import { FormRootError } from "@/components/ui/form-root-error";
import { pmExpenseCreateSchema, type PmExpenseCreateForm } from "@/features/pm/validations";

interface CreateExpenseDialogProps {
  ownerId: number | null;
}

export default function CreateExpenseDialog({ ownerId }: CreateExpenseDialogProps) {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [createExpense, createState] = useCreatePmExpenseMutation();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  const [open, setOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const properties = usePmPropertyOptions(ownerId, { enabled: open && !(role === "agent" && !ownerId) });

  const form = useForm<PmExpenseCreateForm>({
    resolver: zodResolver(pmExpenseCreateSchema),
    defaultValues: {
      property_id: "",
      category: "maintenance",
      amount: "",
      expense_date: "",
      description: "",
      notes: "",
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        form.reset();
        setReceiptFile(null);
      }
    },
    [form],
  );

  const onSubmit = async (values: PmExpenseCreateForm) => {
    try {
      const selectedPropertyOwnerId = (properties.data?.items ?? []).find(
        (p) => String(p.id) === values.property_id,
      )?.owner_id;
      const effectiveOwnerId = ownerId ?? selectedPropertyOwnerId ?? null;

      let receiptDocumentId: number | undefined;
      if (receiptFile) {
        const fd = new FormData();
        fd.append("file", receiptFile);
        fd.append("document_type", "receipt" satisfies DocumentType);
        fd.append("title", values.description || `Expense receipt • ${values.expense_date}`);
        if (effectiveOwnerId) fd.append("owner_id", String(effectiveOwnerId));
        fd.append("property_id", values.property_id);
        fd.append("shared_with_agent", "true");
        const doc = await uploadDoc(fd).unwrap();
        receiptDocumentId = doc.id;
      }

      const payload: ExpenseCreate = {
        owner_id: effectiveOwnerId || undefined,
        property_id: Number(values.property_id),
        category: values.category,
        amount: Number(values.amount),
        expense_date: values.expense_date,
        description: values.description || undefined,
        notes: values.notes || undefined,
        receipt_document_id: receiptDocumentId,
      };
      await createExpense(payload).unwrap();
      toast({ title: "Added", description: "Expense added." });
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({ title: "Failed", description: getErrorMessage(e, "Could not add expense."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="create-expense-desc">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <p id="create-expense-desc" className="sr-only">Create a new expense with category, amount, date, and optional receipt.</p>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
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
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl><Input placeholder="e.g. 1200" type="number" step="0.01" inputMode="decimal" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label>Receipt (optional)</Label>
              <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (!validateFileSize(f, 20)) {
                  e.target.value = "";
                  return;
                }
                setReceiptFile(f);
              }} />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createState.isLoading || uploadDocState.isLoading}>
                {createState.isLoading || uploadDocState.isLoading ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
