import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useMemo, useState} from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Building2 } from "lucide-react";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import PropertyCreateDialog from "@/features/pm/components/PropertyCreateDialog";
import PropertyFilters from "@/features/pm/components/PropertyFilters";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useDebounce } from "@/hooks/useDebounce";
import type { ManagedPropertyStatus, PmProperty } from "@/types/pm";
import { useListPmPropertiesQuery, useUpdatePmPropertyMutation } from "@/features/pm/api/pmApi";
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
import { formatCurrency } from "@/lib/format";
import { purposePrice } from "@/features/properties/lib/price";
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

  const pager = useCursorPagination(pmCursorKey(ownerId, debouncedQ, occupancy, limit));


  const properties = useListPmPropertiesQuery(
    {
      owner_id: ownerId,
      occupancy: occupancy || undefined,
      q: debouncedQ || undefined,
      limit,
      cursor: pager.cursor},
    { skip: role === "agent" && !ownerId },
  );

  const displayData = properties.currentData?.items;

  // The backend has no DELETE for a managed property: archiving keeps its lease history.
  const [updateProperty] = useUpdatePmPropertyMutation();

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
          const price = purposePrice(row.original);
          return (
            <div className="text-sm font-medium tabular-nums">
              {price.amount != null ? `${formatCurrency(price.amount)}${price.unit}` : "—"}
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
              title="Archive Property"
              description={`Archive "${row.original.title}"? It leaves the active portfolio and its lease history stays.`}
              confirmLabel="Archive"
              variant="destructive"
              onConfirm={async () => {
                await updateProperty({ property_id: row.original.id, payload: { management_status: "archived" } }).unwrap();
                toast({ title: "Archived", description: "Property archived." });
              }}
            >
              {(openDialog) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openDialog}
                  disabled={row.original.management_status === "archived"}
                  aria-label={`Archive ${row.original.title}`}
                >
                  <Archive className="mr-1 h-4 w-4" />
                  Archive
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        )},
    ];
    // The archive dialog lives in a cell: keep request state out of this list, or the cell remounts
    // while the dialog is open and the dialog loses its error message.
  }, [updateProperty, toast]);

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
                key={ownerId ?? 'all'}
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
            ) : (!properties.currentData && properties.isFetching) ? (
              <LoadingState type="spinner" />
            ) : displayData?.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={displayData} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={properties.currentData?.has_more ?? false}
                  loading={properties.isFetching}
                  onPrev={pager.prev}
                  onNext={() => properties.currentData && pager.next(properties.currentData.next_cursor)}
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
