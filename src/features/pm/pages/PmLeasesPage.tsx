import {useMemo, useState} from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { LEASE_STATUSES, PAGE_SIZES } from "@/features/pm/constants";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import CreateLeaseDialog from "@/features/pm/components/CreateLeaseDialog";
import { formatDate } from "@/lib/format";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { Lease, LeaseStatus } from "@/types/pm";
import { useListPmLeasesQuery } from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

const leaseBadgeVariant = (status: LeaseStatus) => {
  if (status === "active") return "default";
  if (status === "terminated" || status === "expired") return "outline";
  return "secondary";
};

export default function PmLeasesPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);

  const [status, setStatus] = useState<LeaseStatus | "">("");
  const [limit, setLimit] = useState(50);

  const ownerId = selectedOwnerId;

  const pager = useCursorPagination(`${status}|${limit}`);


  const leases = useListPmLeasesQuery(
    { owner_id: ownerId, status: status || undefined, limit, cursor: pager.cursor },
    { skip: role === "agent" && !ownerId },
  );

  const displayData = leases.data?.items;

  const columns = useMemo<ColumnDef<Lease>[]>(() => {
    return [
      {
        accessorKey: "id",
        header: "Lease",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">#{row.original.id}</div>
            <div className="truncate text-xs text-muted-foreground">
              Property #{row.original.property_id}
            </div>
          </div>
        )},
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={leaseBadgeVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        )},
      {
        id: "tenant",
        header: "Tenant",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">
              {row.original.tenant_name || row.original.tenant_phone || "—"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.tenant_email || "—"}
            </div>
          </div>
        )},
      {
        id: "term",
        header: "Term",
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDate(row.original.start_date)} →{" "}
            {formatDate(row.original.end_date)}
          </span>
        )},
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link to={`/pm/leases/${row.original.id}`}>View</Link>
            </Button>
          </div>
        )},
    ];
  }, []);

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Leases"
          description="Create, renew, terminate, and upload signed lease documents."
          icon={FileText}
          actions={<CreateLeaseDialog ownerId={ownerId} />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lease List</CardTitle>
            <Badge variant="secondary" className="h-fit">
              <FileText className="mr-1 h-3 w-3" />
              {displayData?.length ?? 0} shown
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select
                value={status || "all"}
                onValueChange={(v) => setStatus(v === "all" ? "" : (v as LeaseStatus))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {LEASE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {leases.isError ? (
              <ErrorState
                title="Failed to load leases"
                error={leases.error}
                onRetry={() => { void leases.refetch(); }}
              />
            ) : leases.isLoading ? (
              <LoadingState type="spinner" />
            ) : displayData?.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={displayData} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={leases.data?.has_more ?? false}
                  loading={leases.isFetching}
                  onPrev={pager.prev}
                  onNext={() => leases.data && pager.next(leases.data.next_cursor)}
                />
              </>
            ) : (
              <EmptyState title="No leases" description="Create your first lease to start rent operations." />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  );
}
