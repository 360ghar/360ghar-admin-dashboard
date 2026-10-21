import { useState } from "react";
import type { MaintenanceRequest } from "@/types/pm";
import { useUpdateMaintenanceRequestMutation } from "@/features/pm/api/pmApi";
import MaintenanceUpdateForm from "@/features/pm/components/MaintenanceUpdateForm";
import { Button } from "@/components/ui/button";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

/**
 * Update and close of one maintenance request row. It is a component, not table cell code: a table cell
 * that reads request state forces the column list to change, which remounts the cell and closes its dialog.
 */
export default function MaintenanceRowActions({ request }: { request: MaintenanceRequest }) {
  const { user } = useUserRole();
  const { toast } = useToast();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateRequest, updateState] = useUpdateMaintenanceRequestMutation();

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Update</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update maintenance request</DialogTitle>
            <DialogDescription className="sr-only">Change the status, work order, cost and vendor of the request.</DialogDescription>
          </DialogHeader>
          <MaintenanceUpdateForm
            request={request}
            defaultAssignedAgentId={user?.agent_id ?? null}
            onSubmit={async (payload) => {
              try {
                await updateRequest({ request_id: request.id, payload }).unwrap();
                toast({ title: "Updated", description: "Maintenance request updated." });
                setUpdateOpen(false);
              } catch (e: unknown) {
                toast({ title: "Failed", description: getErrorMessage(e, "Could not update request."), variant: "destructive" });
                throw e;
              }
            }}
            isSubmitting={updateState.isLoading}
          />
        </DialogContent>
      </Dialog>
      {/* The backend has no DELETE for a request: closing it is the way to take it off the queue. */}
      <ConfirmAlertDialog
        title="Close Request"
        description={`Close "${request.title}"? A closed request leaves the open queue and its history stays.`}
        confirmLabel="Close request"
        onConfirm={async () => {
          await updateRequest({ request_id: request.id, payload: { request_status: "closed" } }).unwrap();
          toast({ title: "Closed", description: "Maintenance request closed." });
        }}
      >
        {(openDialog) => (
          <Button variant="outline" size="sm" onClick={openDialog} disabled={request.request_status === "closed"}>
            Close
          </Button>
        )}
      </ConfirmAlertDialog>
    </div>
  );
}
