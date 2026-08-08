import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2, Wrench } from "lucide-react";
import {
  MAINTENANCE_REQUEST_STATUSES,
  PAGE_SIZES,
  WORK_ORDER_STATUSES} from "@/features/pm/constants";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import CreateRequestDialog from "@/features/pm/components/CreateRequestDialog";
import MaintenanceUpdateForm from "@/features/pm/components/MaintenanceUpdateForm";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
  WorkOrderStatus} from "@/types/pm";
import {
  useListMaintenanceRequestsQuery,
  useUpdateMaintenanceRequestMutation,
  useDeleteMaintenanceRequestMutation} from "@/features/pm/api/pmApi";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/ui/page-header";

export default function PmMaintenancePage() {
  const { role, user } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const ownerId = selectedOwnerId;

  const [requestStatus, setRequestStatus] = useState<MaintenanceRequestStatus | "">("");
  const [workOrderStatus, setWorkOrderStatus] = useState<WorkOrderStatus | "">("");
  const [limit, setLimit] = useState(50);

  const pager = useCursorPagination(`${requestStatus}|${workOrderStatus}|${limit}`);


  const requests = useListMaintenanceRequestsQuery(
    {
      owner_id: ownerId,
      request_status: requestStatus || undefined,
      work_order_status: workOrderStatus || undefined,
      limit,
      cursor: pager.cursor},
    { skip: role === "agent" && !ownerId },
  );

  const [updateRequest, updateState] = useUpdateMaintenanceRequestMutation();
  const [deleteRequest, deleteState] = useDeleteMaintenanceRequestMutation();

  const columns = useMemo<ColumnDef<MaintenanceRequest>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: "Request",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              #{row.original.id} &bull; Property #{row.original.property_id} &bull; {row.original.category}
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
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Update</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Update maintenance request</DialogTitle>
                </DialogHeader>
                <MaintenanceUpdateForm
                  request={row.original}
                  defaultAssignedAgentId={user?.agent_id ?? null}
                  onSubmit={async (payload) => {
                    try {
                      await updateRequest({ request_id: row.original.id, payload }).unwrap();
                      toast({ title: "Updated", description: "Maintenance request updated." });
                    } catch (e: unknown) {
                      toast({ title: "Failed", description: getErrorMessage(e, "Could not update request."), variant: "destructive" });
                    }
                  }}
                  isSubmitting={updateState.isLoading}
                />
              </DialogContent>
            </Dialog>
            <ConfirmAlertDialog
              title="Delete Request"
              description={`Are you sure you want to delete "${row.original.title}"? This action cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await deleteRequest(row.original.id).unwrap();
                  toast({ title: "Deleted", description: "Maintenance request deleted." });
                } catch (e: unknown) {
                  toast({ title: "Failed", description: getErrorMessage(e, "Could not delete request."), variant: "destructive" });
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
  }, [toast, updateRequest, updateState.isLoading, deleteRequest, deleteState.isLoading, user?.agent_id]);

  const requestItems = requests.data?.items ?? [];

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Maintenance"
          description="Triage requests and manage work orders, vendors, and completion details."
          icon={Wrench}
          actions={<CreateRequestDialog ownerId={ownerId} />}
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
            ) : requests.isLoading ? (
              <LoadingState type="spinner" />
            ) : requestItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={requestItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={requests.data?.has_more ?? false}
                  loading={requests.isFetching}
                  onPrev={pager.prev}
                  onNext={() => requests.data && pager.next(requests.data.next_cursor)}
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
