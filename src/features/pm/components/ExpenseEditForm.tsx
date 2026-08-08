import { useState } from "react";
import type { Expense, ExpenseUpdate } from "@/types/pm";
import { EXPENSE_CATEGORIES } from "@/features/pm/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { validateFileSize } from "@/lib/fileValidation";
import { FormRootError } from "@/components/ui/form-root-error";
import {
  pmExpenseUpdateSchema,
  type PmExpenseUpdateForm,
} from "@/features/pm/validations";

interface ExpenseEditFormProps {
  expense: Expense;
  onUploadReceipt: (file: File) => Promise<number>;
  onSubmit: (payload: ExpenseUpdate) => Promise<void>;
  isSubmitting: boolean;
}

export default function ExpenseEditForm({
  expense,
  onUploadReceipt,
  onSubmit,
  isSubmitting,
}: ExpenseEditFormProps) {
  const { toast } = useToast();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const form = useForm<PmExpenseUpdateForm>({
    resolver: zodResolver(pmExpenseUpdateSchema),
    defaultValues: {
      category: expense.category,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      description: expense.description || "",
      notes: expense.notes || "",
    },
  });

  const save = async (values: PmExpenseUpdateForm) => {
    try {
      let receiptDocumentId: number | undefined;
      if (receiptFile) {
        receiptDocumentId = await onUploadReceipt(receiptFile);
      }
      const payload: ExpenseUpdate = {
        category: values.category,
        amount: Number(values.amount),
        expense_date: values.expense_date,
        description: values.description,
        notes: values.notes,
        receipt_document_id: receiptDocumentId,
      };
      await onSubmit(payload);
      toast({ title: "Updated", description: "Expense updated." });
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({
        title: "Failed",
        description: getErrorMessage(e, "Could not update expense."),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(save)(e)} className="space-y-4">
          <FormRootError form={form} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
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
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label>Replace receipt (optional)</Label>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
