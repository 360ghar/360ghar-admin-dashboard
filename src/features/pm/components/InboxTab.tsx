import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useDecideApplicationMutation } from "@/features/pm/api/pmApi";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { APPLICATION_STATUSES, PAGE_SIZES } from "@/features/pm/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RentalApplication, RentalApplicationDecision, RentalApplicationStatus } from "@/types/pm";

interface InboxTabProps {
  applicationsData?: RentalApplication[];
  applicationsIsLoading: boolean;
  applicationsIsError: boolean;
  applicationsRefetch: () => void;
  appsLimit: number;
  appsCanPrev: boolean;
  appsCanNext: boolean;
  onAppsPrev: () => void;
  onAppsNext: () => void;
  status: RentalApplicationStatus | "";
  onStatusChange: (status: RentalApplicationStatus | "") => void;
  /** The form the inbox is filtered to, from the `form_id` URL parameter. */
  formId: number | null;
  onClearForm: () => void;
  appsLimitValue: number;
  onAppsLimitChange: (limit: number) => void;
  decideIsLoading: boolean;
  onApprove: (application: RentalApplication) => void;
  onReject: (application: RentalApplication) => void;
}

export default function InboxTab({
  applicationsData,
  applicationsIsLoading,
  applicationsIsError,
  applicationsRefetch,
  appsLimit: _appsLimit,
  appsCanPrev,
  appsCanNext,
  onAppsPrev,
  onAppsNext,
  status,
  onStatusChange,
  formId,
  onClearForm,
  appsLimitValue,
  onAppsLimitChange,
  decideIsLoading,
  onApprove,
  onReject,
}: InboxTabProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkPending, setBulkPending] = useState(false);
  const selectedRows = (applicationsData ?? []).filter((app) => rowSelection[String(app.id)]);
  const { toast } = useToast();
  const [decideApplication] = useDecideApplicationMutation();

  const handleBulkDecision = async (type: 'approve' | 'reject') => {
    if (selectedRows.length === 0) return;
    setBulkPending(true);
    const decision: RentalApplicationDecision['decision'] = type === 'approve' ? 'approved' : 'rejected';
    const results = await Promise.allSettled(selectedRows.map((app) =>
      decideApplication({ application_id: app.id, payload: { decision } }).unwrap(),
    ));
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    const failedRows = selectedRows.filter((_app, index) => results[index].status === 'rejected');
    const rejected = failedRows.length;
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason as unknown;
    if (rejected === 0) {
      toast({
        title: type === 'approve' ? 'Approved' : 'Rejected',
        description: `${fulfilled} application${fulfilled === 1 ? '' : 's'} ${decision}.`,
      });
    } else if (fulfilled === 0) {
      toast({
        title: 'Failed',
        description: getErrorMessage(firstError, `Could not ${type} ${rejected} application${rejected === 1 ? '' : 's'}.`),
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Partial success',
        description: `${fulfilled} ${decision}, ${rejected} failed: ${failedRows.map((app) => `#${app.id}`).join(', ')}`,
        variant: 'destructive',
      });
    }
    setRowSelection(Object.fromEntries(failedRows.map((app) => [String(app.id), true])));
    setBulkPending(false);
  };

  const appColumns = useMemo<ColumnDef<RentalApplication>[]>(() => {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "id",
        header: "Application",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">#{row.original.id}</div>
            <div className="truncate text-xs text-muted-foreground">
              Form #{row.original.form_id} &bull; {row.original.property_name || `Property #${row.original.property_id}`}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.status}</Badge>
        ),
      },
      {
        id: "applicant",
        header: "Applicant",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.applicant_full_name || "—"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.applicant_phone || row.original.applicant_email || "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "submitted_at",
        header: "Submitted",
        cell: ({ row }) =>
          row.original.submitted_at ? formatDateTime(row.original.submitted_at) : "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/pm/applications/${row.original.id}`}>View</Link>
            </Button>
            <Button
              size="sm"
              disabled={decideIsLoading || row.original.status === "approved"}
              onClick={() => onApprove(row.original)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={decideIsLoading || row.original.status === "rejected"}
              onClick={() => onReject(row.original)}
            >
              Reject
            </Button>
          </div>
        ),
      },
    ];
  }, [decideIsLoading, onApprove, onReject]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Applications Inbox</CardTitle>
        <Badge variant="secondary" className="h-fit">
          {applicationsData?.length ?? 0} shown
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            value={status || "all"}
            onValueChange={(v) => onStatusChange(v === "all" ? "" : (v as RentalApplicationStatus))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {APPLICATION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(appsLimitValue)}
            onValueChange={(v) => onAppsLimitChange(Number(v))}
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

        {formId !== null ? (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">Form #{formId}</Badge>
            <Button variant="ghost" size="sm" onClick={onClearForm} aria-label="Show every form">
              <X className="mr-1 h-3 w-3" />
              Clear form filter
            </Button>
          </div>
        ) : null}

        {applicationsIsError ? (
          <ErrorState title="Failed to load applications" onRetry={() => { void applicationsRefetch(); }} />
        ) : applicationsIsLoading ? (
          <LoadingState type="spinner" />
        ) : applicationsData?.length ? (
          <>
            {selectedRows.length > 0 && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-cohere-md border border-cohere-card-border bg-card/40 p-3 backdrop-blur-md">
                <span className="text-sm font-medium">
                  {selectedRows.length} selected
                </span>
                <Button
                  size="sm"
                  disabled={bulkPending}
                  onClick={() => { void handleBulkDecision('approve') }}
                >
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkPending}
                  onClick={() => { void handleBulkDecision('reject') }}
                >
                  Reject Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRowSelection({})}
                >
                  Clear
                </Button>
              </div>
            )}
            <ResponsiveDataTable
              columns={appColumns}
              data={applicationsData}
              enableRowSelection
              getRowId={(row) => String(row.id)}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
            <CursorPager
              canPrev={appsCanPrev}
              hasMore={appsCanNext}
              onPrev={onAppsPrev}
              onNext={onAppsNext}
            />
          </>
        ) : (
          <EmptyState title="No applications" description="Submissions will show up here." />
        )}
      </CardContent>
    </Card>
  );
}
