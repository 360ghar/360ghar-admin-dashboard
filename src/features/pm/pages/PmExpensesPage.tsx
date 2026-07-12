import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import { EXPENSE_CATEGORIES, PAGE_SIZES } from "@/features/pm/constants";
import { formatINR, downloadCsv } from "@/features/pm/utils";
import { formatDate } from "@/lib/format";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import CreateExpenseDialog from "@/features/pm/components/CreateExpenseDialog";
import ExpenseEditForm from "@/features/pm/components/ExpenseEditForm";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { DocumentType, Expense, ExpenseCategory } from "@/types/pm";
import {
  useListPmExpensesQuery,
  useUpdatePmExpenseMutation,
  useDeletePmExpenseMutation,
  useUploadPmDocumentMutation} from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";

export default function PmExpensesPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const ownerId = selectedOwnerId;

  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState(50);

  const validDateRange = !startDate || !endDate || startDate <= endDate;

  const pager = useCursorPagination(`${category}|${startDate}|${endDate}|${limit}`);


  const expenses = useListPmExpensesQuery(
    {
      owner_id: ownerId,
      category: category || undefined,
      start_date: validDateRange && startDate ? startDate : undefined,
      end_date: validDateRange && endDate ? endDate : undefined,
      limit,
      cursor: pager.cursor},
    { skip: role === "agent" && !ownerId },
  );

  const [updateExpense, updateState] = useUpdatePmExpenseMutation();
  const [deleteExpense, deleteState] = useDeletePmExpenseMutation();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  const columns = useMemo<ColumnDef<Expense>[]>(() => {
    return [
      {
        accessorKey: "expense_date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.expense_date)},
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>},
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatINR(row.original.amount)},
      {
        accessorKey: "property_id",
        header: "Property",
        cell: ({ row }) => <span className="text-sm">#{row.original.property_id}</span>},
      {
        id: "receipt",
        header: "Receipt",
        cell: ({ row }) =>
          row.original.receipt_document_id ? (
            <Badge variant="outline">Doc #{row.original.receipt_document_id}</Badge>
          ) : (
            "—"
          )},
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit expense</DialogTitle>
                </DialogHeader>
                <ExpenseEditForm
                  expense={row.original}
                  onUploadReceipt={async (file) => {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("document_type", "receipt" satisfies DocumentType);
                    fd.append("title", `Expense receipt • #${row.original.id}`);
                    fd.append("owner_id", String(row.original.owner_id));
                    fd.append("property_id", String(row.original.property_id));
                    fd.append("shared_with_agent", "true");
                    const doc = await uploadDoc(fd).unwrap();
                    return doc.id;
                  }}
                  onSubmit={async (payload) => {
                    await updateExpense({ expense_id: row.original.id, payload }).unwrap();
                  }}
                  isSubmitting={updateState.isLoading || uploadDocState.isLoading}
                />
              </DialogContent>
            </Dialog>
            <ConfirmAlertDialog
              title="Delete Expense"
              description={`Are you sure you want to delete expense #${row.original.id}? This action cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await deleteExpense(row.original.id).unwrap();
                  toast({ title: "Deleted", description: "Expense deleted." });
                } catch (e: unknown) {
                  toast({ title: "Failed", description: getErrorMessage(e, "Could not delete expense."), variant: "destructive" });
                }
              }}
            >
              {(openDialog) => (
                <Button variant="destructive" size="sm" onClick={openDialog} disabled={deleteState.isLoading} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        )},
    ];
  }, [updateExpense, updateState.isLoading, deleteExpense, deleteState.isLoading, uploadDoc, uploadDocState.isLoading, toast]);

  const expenseItems = expenses.data?.items ?? [];

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track expenses and attach receipts.</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateExpenseDialog ownerId={ownerId} />
            <Button
              variant="outline"
              onClick={() => {
                const rows = expenseItems.map((e) => ({
                  id: e.id,
                  expense_date: e.expense_date,
                  category: e.category,
                  amount: e.amount,
                  property_id: e.property_id,
                  receipt_document_id: e.receipt_document_id,
                  description: e.description,
                  notes: e.notes}));
                downloadCsv(`expenses_${new Date().toISOString().slice(0, 10)}.csv`, rows);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Expense List</CardTitle>
            <Badge variant="secondary" className="h-fit">
              {expenseItems.length} shown
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Select
                value={category || "all"}
                onValueChange={(v) => setCategory(v === "all" ? "" : (v as ExpenseCategory))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={!validDateRange ? "border-destructive" : ""}
              />
              {!validDateRange && <span className="text-xs text-destructive">End date must be after start date</span>}
              <Select
                value={String(limit)}
                onValueChange={(v) => setLimit(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {expenses.isError ? (
              <ErrorState
                title="Failed to load expenses"
                error={expenses.error}
                onRetry={() => { void expenses.refetch(); }}
              />
            ) : expenses.isLoading ? (
              <LoadingState type="spinner" />
            ) : expenseItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={expenseItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={expenses.data?.has_more ?? false}
                  loading={expenses.isFetching}
                  onPrev={pager.prev}
                  onNext={() => expenses.data && pager.next(expenses.data.next_cursor)}
                />
              </>
            ) : (
              <EmptyState title="No expenses" description="Add an expense to track costs." />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  );
}
