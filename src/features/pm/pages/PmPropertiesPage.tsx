import {useMemo, useState} from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Trash2 } from "lucide-react";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import PropertyCreateDialog from "@/features/pm/components/PropertyCreateDialog";
import PropertyFilters from "@/features/pm/components/PropertyFilters";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useDebounce } from "@/hooks/useDebounce";
import type { ManagedPropertyStatus, PmProperty } from "@/types/pm";
import { useDeletePmPropertyMutation, useListPmPropertiesQuery } from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { deriveNightlyRate } from "@/features/properties/lib/nightlyRate";
import { PageHeader } from "@/components/ui/page-header";

const statusBadgeVariant = (status?: ManagedPropertyStatus | null) => {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  if (status === "archived") return "outline";
  return "outline";
};

export default function PmPropertiesPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [occupancy, setOccupancy] = useState<"occupied" | "vacant" | "">("");
  const [limit, setLimit] = useState(50);

  const ownerId = selectedOwnerId;

  const pager = useCursorPagination(`${debouncedQ}|${occupancy}|${limit}|${ownerId}`);


  const properties = useListPmPropertiesQuery(
    {
      owner_id: ownerId,
      occupancy: occupancy || undefined,
      q: debouncedQ || undefined,
      limit,
      cursor: pager.cursor},
    { skip: role === "agent" && !ownerId },
  );

  const displayData = properties.data?.items;

  const [deleteProperty, deletePropertyState] = useDeletePmPropertyMutation();

  const columns = useMemo<ColumnDef<PmProperty>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: "Property",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.locality ||
                row.original.city ||
                row.original.full_address ||
                "—"}
            </div>
          </div>
        )},
      {
        id: "occupancy",
        header: "Occupancy",
        cell: ({ row }) => (
          <Badge
            variant={row.original.current_lease_id ? "default" : "outline"}
          >
            {row.original.current_lease_id ? "occupied" : "vacant"}
          </Badge>
        )},
      {
        accessorKey: "management_status",
        header: "Management",
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.management_status)}>
            {row.original.management_status || "—"}
          </Badge>
        )},
      {
        id: "price",
        header: "Price",
        cell: ({ row }) => {
          const nightly = deriveNightlyRate(row.original);
          return (
            <div className="text-sm">
              <div className="font-medium tabular-nums">{formatCurrency(row.original.base_price)}</div>
              {nightly != null && (
                <div className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(nightly)}/night
                </div>
              )}
            </div>
          );
        }},
      {
        accessorKey: "payment_due_day",
        header: "Due Day",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.payment_due_day ?? "—"}</span>
        )},
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/pm/properties/${row.original.id}`}>View</Link>
            </Button>
            <ConfirmAlertDialog
              title="Delete Property"
              description={`Are you sure you want to delete "${row.original.title}"? This action cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await deleteProperty(row.original.id).unwrap();
                  toast({ title: "Deleted", description: "Property deleted." });
                } catch (e: unknown) {
                  toast({ title: "Failed", description: getErrorMessage(e, "Could not delete property."), variant: "destructive" });
                }
              }}
            >
              {(openDialog) => (
                <Button variant="destructive" size="sm" onClick={openDialog} disabled={deletePropertyState.isLoading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        )},
    ];
  }, [deleteProperty, deletePropertyState.isLoading, toast]);

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Managed Properties"
          description={
            role === "admin"
              ? "All managed properties."
              : "Managed properties for the selected owner."
          }
          icon={Building2}
          actions={
            <div className="flex items-center gap-2">
              <PropertyCreateDialog
                ownerId={ownerId}
                disabled={role === "admin" && !ownerId}
              />
              <Badge variant="secondary" className="h-fit">
                {displayData?.length ?? 0} shown
              </Badge>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PropertyFilters
              q={q}
              onQChange={setQ}
              occupancy={occupancy}
              onOccupancyChange={setOccupancy}
              limit={limit}
              onLimitChange={setLimit}
            />

            {properties.isError ? (
              <ErrorState
                title="Failed to load properties"
                error={properties.error}
                onRetry={() => { void properties.refetch(); }}
              />
            ) : properties.isLoading ? (
              <LoadingState type="spinner" />
            ) : displayData?.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={displayData} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={properties.data?.has_more ?? false}
                  loading={properties.isFetching}
                  onPrev={pager.prev}
                  onNext={() => properties.data && pager.next(properties.data.next_cursor)}
                />
              </>
            ) : (
              <EmptyState
                title="No managed properties"
                description="Try adjusting filters."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  );
}
