import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { DocumentType, Expense } from "@/types/pm";
import {
  useDeletePmExpenseMutation,
  useUpdatePmExpenseMutation,
  useUploadPmDocumentMutation,
} from "@/features/pm/api/pmApi";
import ExpenseEditForm from "@/features/pm/components/ExpenseEditForm";
import { Button } from "@/components/ui/button";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * Edit and delete of one expense row. It is a component, not table cell code: a table cell that reads
 * request state forces the column list to change, which remounts the cell and closes its open dialog.
 */
export default function ExpenseRowActions({ expense }: { expense: Expense }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [updateExpense, updateState] = useUpdatePmExpenseMutation();
  const [deleteExpense, deleteState] = useDeletePmExpenseMutation();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Edit</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription className="sr-only">Change the expense details or replace its receipt.</DialogDescription>
          </DialogHeader>
          <ExpenseEditForm
            expense={expense}
            onUploadReceipt={async (file) => {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("document_type", "receipt" satisfies DocumentType);
              fd.append("title", `Expense receipt • #${expense.id}`);
              fd.append("owner_id", String(expense.owner_id));
              fd.append("property_id", String(expense.property_id));
              fd.append("shared_with_agent", "true");
              const doc = await uploadDoc(fd).unwrap();
              return doc.id;
            }}
            onSubmit={async (payload) => {
              await updateExpense({ expense_id: expense.id, payload }).unwrap();
              setEditOpen(false);
            }}
            isSubmitting={updateState.isLoading || uploadDocState.isLoading}
          />
        </DialogContent>
      </Dialog>
      <ConfirmAlertDialog
        title="Delete Expense"
        description={`Are you sure you want to delete expense #${expense.id}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          await deleteExpense(expense.id).unwrap();
          toast({ title: "Deleted", description: "Expense deleted." });
        }}
      >
        {(openDialog) => (
          <Button variant="destructive" size="sm" onClick={openDialog} disabled={deleteState.isLoading} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </ConfirmAlertDialog>
    </div>
  );
}
