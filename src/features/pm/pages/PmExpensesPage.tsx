import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Receipt } from "lucide-react";
import { EXPENSE_CATEGORIES, PAGE_SIZES } from "@/features/pm/constants";
import { downloadCsv } from "@/features/pm/utils";
import { formatCurrency } from "@/lib/format"
import { formatDate } from "@/lib/format";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import CreateExpenseDialog from "@/features/pm/components/CreateExpenseDialog";
import ExpenseRowActions from "@/features/pm/components/ExpenseRowActions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { Expense, ExpenseCategory } from "@/types/pm";
import { useListPmExpensesQuery } from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import CountUp from "@/components/reactbits/CountUp";
import { PageHeader } from "@/components/ui/page-header";

export default function PmExpensesPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);

  const ownerId = selectedOwnerId;

  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState(50);

  const validDateRange = !startDate || !endDate || startDate <= endDate;

  const pager = useCursorPagination(pmCursorKey(ownerId, category, startDate, endDate, limit));


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

  const columns = useMemo<ColumnDef<Expense>[]>(() => {
    return [
      {
        accessorKey: "expense_date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.expense_date)},
      {
        accessorKey: "category",
        header: "Expense",
        cell: ({ row }) => (
          <div className="min-w-0">
            {row.original.title ? <div className="truncate font-medium">{row.original.title}</div> : null}
            <Badge variant="secondary">{row.original.category}</Badge>
          </div>
        )},
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount)},
      {
        accessorKey: "property_id",
        header: "Property",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.property_name || `#${row.original.property_id}`}</span>
        )},
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
        cell: ({ row }) => <ExpenseRowActions expense={row.original} />},
    ];
  }, []);

  const expenseItems = useMemo(() => expenses.currentData?.items ?? [], [expenses.currentData?.items]);

  const totalExpenses = useMemo(
    () => expenseItems.reduce((sum, e) => sum + e.amount, 0),
    [expenseItems],
  );

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Expenses"
          description="Track expenses and attach receipts."
          icon={Receipt}
          actions={
            <div className="flex items-center gap-2">
              <CreateExpenseDialog key={ownerId ?? 'all'} ownerId={ownerId} />
              <Button
                variant="outline"
                onClick={() => {
                  const rows = expenseItems.map((e) => ({
                    id: e.id,
                    expense_date: e.expense_date,
                    title: e.title,
                    category: e.category,
                    amount: e.amount,
                    property_id: e.property_id,
                    property_name: e.property_name,
                    receipt_document_id: e.receipt_document_id,
                    description: e.description,
                    notes: e.notes}));
                  downloadCsv(`expenses_${new Date().toISOString().slice(0, 10)}.csv`, rows);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export current page CSV
              </Button>
            </div>
          }
        />

        {expenseItems.length ? (
          <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
            <div className="text-xs font-medium text-muted-foreground">Total expenses</div>
            <CountUp
              to={totalExpenses}
              duration={1.2}
              format={(n) => formatCurrency(n)}
              className="text-2xl font-semibold tracking-tight tabular-nums"
            />
            <div className="mt-0.5 text-xs text-muted-foreground">Current page</div>
          </div>
        ) : null}

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
            ) : (!expenses.currentData && expenses.isFetching) ? (
              <LoadingState type="spinner" />
            ) : expenseItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={expenseItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={expenses.currentData?.has_more ?? false}
                  loading={expenses.isFetching}
                  onPrev={pager.prev}
                  onNext={() => expenses.currentData && pager.next(expenses.currentData.next_cursor)}
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
