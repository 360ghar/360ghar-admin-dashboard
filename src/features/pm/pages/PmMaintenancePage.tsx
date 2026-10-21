import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Wrench } from "lucide-react";
import {
  MAINTENANCE_REQUEST_STATUSES,
  PAGE_SIZES,
  WORK_ORDER_STATUSES} from "@/features/pm/constants";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import CreateRequestDialog from "@/features/pm/components/CreateRequestDialog";
import MaintenanceRowActions from "@/features/pm/components/MaintenanceRowActions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
  WorkOrderStatus} from "@/types/pm";
import { useListMaintenanceRequestsQuery } from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

export default function PmMaintenancePage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);

  const ownerId = selectedOwnerId;

  const [requestStatus, setRequestStatus] = useState<MaintenanceRequestStatus | "">("");
  const [workOrderStatus, setWorkOrderStatus] = useState<WorkOrderStatus | "">("");
  const [limit, setLimit] = useState(50);

  const pager = useCursorPagination(pmCursorKey(ownerId, requestStatus, workOrderStatus, limit));


  const requests = useListMaintenanceRequestsQuery(
    {
      owner_id: ownerId,
      request_status: requestStatus || undefined,
      work_order_status: workOrderStatus || undefined,
      limit,
      cursor: pager.cursor},
    { skip: role === "agent" && !ownerId },
  );

  const columns = useMemo<ColumnDef<MaintenanceRequest>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: "Request",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              #{row.original.id} &bull; {row.original.property_title || `Property #${row.original.property_id}`} &bull; {row.original.category}
              {row.original.tenant_name ? <> &bull; {row.original.tenant_name}</> : null}
            </div>
          </div>
        )},
      {
        accessorKey: "urgency",
        header: "Urgency",
        cell: ({ row }) => {
          // Backend urgency: emergency | high | medium | low
          const urgencyMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            emergency: "destructive",
            high: "default",
            medium: "secondary",
            low: "outline"};
          return (
            <Badge variant={urgencyMap[row.original.urgency] ?? "secondary"}>
              {row.original.urgency}
            </Badge>
          );
        }},
      {
        accessorKey: "request_status",
        header: "Request status",
        cell: ({ row }) => <Badge variant="outline">{row.original.request_status}</Badge>},
      {
        accessorKey: "work_order_status",
        header: "Work order",
        cell: ({ row }) => <Badge variant="secondary">{row.original.work_order_status || "—"}</Badge>},
      {
        accessorKey: "vendor_name",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="min-w-0">
            {row.original.vendor_name ? (
              <>
                <div className="truncate">{row.original.vendor_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {row.original.vendor_contact || ""}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        )},
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <MaintenanceRowActions request={row.original} />},
    ];
  }, []);

  const requestItems = requests.currentData?.items ?? [];

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Maintenance"
          description="Triage requests and manage work orders, vendors, and completion details."
          icon={Wrench}
          actions={<CreateRequestDialog key={ownerId ?? 'all'} ownerId={ownerId} />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Maintenance Queue</CardTitle>
            <Badge variant="secondary" className="h-fit">
              <Wrench className="mr-1 h-3 w-3" />
              {requestItems.length} shown
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Select
                value={requestStatus || "all"}
                onValueChange={(v) => setRequestStatus(v === "all" ? "" : (v as MaintenanceRequestStatus))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Request status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {MAINTENANCE_REQUEST_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={workOrderStatus || "all"}
                onValueChange={(v) => setWorkOrderStatus(v === "all" ? "" : (v as WorkOrderStatus))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Work order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {WORK_ORDER_STATUSES.map((s) => (
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

            {requests.isError ? (
              <ErrorState
                title="Failed to load maintenance requests"
                error={requests.error}
                onRetry={() => { void requests.refetch(); }}
              />
            ) : (!requests.currentData && requests.isFetching) ? (
              <LoadingState type="spinner" />
            ) : requestItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={requestItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={requests.currentData?.has_more ?? false}
                  loading={requests.isFetching}
                  onPrev={pager.prev}
                  onNext={() => requests.currentData && pager.next(requests.currentData.next_cursor)}
                />
              </>
            ) : (
              <EmptyState title="No maintenance requests" description="New requests will show up here." />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  );
}
