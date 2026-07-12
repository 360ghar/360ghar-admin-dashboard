import {useCallback,  useState} from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useDebounce } from "@/hooks/useDebounce";
import type { RentalApplication, TenantStatus } from "@/types/pm";
import {
  useDecideApplicationMutation,
  useDeleteApplicationMutation,
  useListApplicationFormsQuery,
  useListApplicationsQuery} from "@/features/pm/api/pmApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import { ApplicationTable } from "@/features/pm/components/ApplicationTable";
import { CreateApplicationFormDialog } from "@/features/pm/components/CreateApplicationFormDialog";
import { useCursorPagination } from "@/hooks/useCursorPagination";

export default function PmApplicationsPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const ownerId = selectedOwnerId;

  const [tab, setTab] = useState<"forms" | "inbox">("forms");

  // Forms list
  const [formsQ, setFormsQ] = useState("");
  const debouncedFormsQ = useDebounce(formsQ, 300);
  const [formsLimit, setFormsLimit] = useState(50);
  const formsPager = useCursorPagination(`${debouncedFormsQ}|${formsLimit}|${ownerId}`);
  const forms = useListApplicationFormsQuery(
    {
      owner_id: ownerId,
      q: debouncedFormsQ || undefined,
      limit: formsLimit,
      cursor: formsPager.cursor},
    { skip: tab !== "forms" || (role === "agent" && !ownerId) },
  );

  const formsDisplayData = forms.data?.items;

  // Inbox list
  const [status, setStatus] = useState<TenantStatus | "">("");
  const [appsLimit, setAppsLimit] = useState(50);
  const appsPager = useCursorPagination(`${status}|${appsLimit}|${ownerId}`);
  const applications = useListApplicationsQuery(
    {
      owner_id: ownerId,
      status: status || undefined,
      limit: appsLimit,
      cursor: appsPager.cursor},
    { skip: tab !== "inbox" || (role === "agent" && !ownerId) },
  );

  const appsDisplayData = applications.data?.items;

  const [decideApplication, decideState] = useDecideApplicationMutation();
  const [deleteApplication] = useDeleteApplicationMutation();

  // Confirmation dialog state for approve/reject actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "reject";
    applicationId: number | null;
    applicantName: string;
  }>({ open: false, type: "approve", applicationId: null, applicantName: "" });

  const handleDecisionConfirm = useCallback(async () => {
    if (!confirmDialog.applicationId) return;
    const decision = confirmDialog.type === "approve" ? "approved" : "rejected";
    try {
      await decideApplication({
        application_id: confirmDialog.applicationId,
        payload: { decision }}).unwrap();
      toast({
        title: confirmDialog.type === "approve" ? "Approved" : "Rejected",
        description: `Application ${decision}.`});
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: getErrorMessage(
          e,
          `Could not ${confirmDialog.type} application.`,
        ),
        variant: "destructive"});
    } finally {
      setConfirmDialog({
        open: false,
        type: "approve",
        applicationId: null,
        applicantName: ""});
    }
  }, [
    confirmDialog.applicationId,
    confirmDialog.type,
    decideApplication,
    toast,
  ]);

  const openConfirmDialog = useCallback(
    (type: "approve" | "reject", application: RentalApplication) => {
      setConfirmDialog({
        open: true,
        type,
        applicationId: application.id,
        applicantName:
          application.applicant_full_name || `Application #${application.id}`});
    },
    [],
  );

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Applications</h1>
            <p className="text-sm text-muted-foreground">
              Create forms, share links, and process submissions.
            </p>
          </div>
          <CreateApplicationFormDialog
            ownerId={ownerId}
            isAgentWithoutOwner={role === "agent" && !ownerId}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={tab === "forms" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("forms")}
          >
            Forms
          </Button>
          <Button
            variant={tab === "inbox" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("inbox")}
          >
            Inbox
          </Button>
        </div>

        <ApplicationTable
          tab={tab}
          formsData={formsDisplayData}
          formsIsLoading={forms.isLoading}
          formsIsError={forms.isError}
          formsRefetch={() => { void forms.refetch() }}
          formsLimit={formsLimit}
          formsCanPrev={formsPager.canPrev}
          formsCanNext={forms.data?.has_more ?? false}
          onFormsPrev={formsPager.prev}
          onFormsNext={() => forms.data && formsPager.next(forms.data.next_cursor)}
          formsQ={formsQ}
          onFormsQChange={setFormsQ}
          formsLimitValue={formsLimit}
          onFormsLimitChange={setFormsLimit}
          toast={toast}
          applicationsData={appsDisplayData}
          applicationsIsLoading={applications.isLoading}
          applicationsIsError={applications.isError}
          applicationsRefetch={() => { void applications.refetch() }}
          appsLimit={appsLimit}
          appsCanPrev={appsPager.canPrev}
          appsCanNext={applications.data?.has_more ?? false}
          onAppsPrev={appsPager.prev}
          onAppsNext={() => applications.data && appsPager.next(applications.data.next_cursor)}
          status={status}
          onStatusChange={setStatus}
          appsLimitValue={appsLimit}
          onAppsLimitChange={setAppsLimit}
          decideIsLoading={decideState.isLoading}
          onApprove={(app) => openConfirmDialog("approve", app)}
          onReject={(app) => openConfirmDialog("reject", app)}
          onDeleteApplication={async (applicationId) => {
            try {
              await deleteApplication(applicationId).unwrap();
              toast({ title: "Deleted", description: "Application deleted." });
            } catch (e: unknown) {
              toast({ title: "Failed", description: getErrorMessage(e, "Could not delete application."), variant: "destructive" });
            }
          }}
        />
      </div>

      {/* Confirmation Dialog for Approve/Reject */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({
              open: false,
              type: "approve",
              applicationId: null,
              applicantName: ""});
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "approve"
                ? "Approve Application"
                : "Reject Application"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "approve"
                ? `Are you sure you want to approve "${confirmDialog.applicantName}"? This will mark the applicant as approved.`
                : `Are you sure you want to reject "${confirmDialog.applicantName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decideState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDecisionConfirm()}
              disabled={decideState.isLoading}
              className={
                confirmDialog.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {decideState.isLoading
                ? confirmDialog.type === "approve"
                  ? "Approving…"
                  : "Rejecting…"
                : confirmDialog.type === "approve"
                  ? "Approve"
                  : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerScopeGate>
  );
}
