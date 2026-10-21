import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useCallback, useEffect, useState} from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useDebounce } from "@/hooks/useDebounce";
import type { RentalApplication, RentalApplicationStatus } from "@/types/pm";
import {
  useDecideApplicationMutation,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import { ApplicationTable } from "@/features/pm/components/ApplicationTable";
import { CreateApplicationFormDialog } from "@/features/pm/components/CreateApplicationFormDialog";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { PageHeader } from "@/components/ui/page-header";

export default function PmApplicationsPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const ownerId = selectedOwnerId;

  // The Forms tab links here with `?tab=inbox&form_id=N`: the URL holds the tab and the form filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: "forms" | "inbox" = searchParams.get("tab") === "inbox" ? "inbox" : "forms";
  const formIdParam = Number(searchParams.get("form_id"));
  const formId = Number.isInteger(formIdParam) && formIdParam > 0 ? formIdParam : null;
  const setTab = useCallback(
    (next: "forms" | "inbox") => setSearchParams(next === "inbox" ? { tab: "inbox" } : {}, { replace: true }),
    [setSearchParams],
  );
  const clearFormFilter = useCallback(() => setSearchParams({ tab: "inbox" }, { replace: true }), [setSearchParams]);

  // Forms list
  const [formsQ, setFormsQ] = useState("");
  const debouncedFormsQ = useDebounce(formsQ, 300);
  const [formsLimit, setFormsLimit] = useState(50);
  const formsPager = useCursorPagination(pmCursorKey(ownerId, debouncedFormsQ, formsLimit));
  const forms = useListApplicationFormsQuery(
    {
      owner_id: ownerId,
      q: debouncedFormsQ || undefined,
      limit: formsLimit,
      cursor: formsPager.cursor},
    { skip: tab !== "forms" || (role === "agent" && !ownerId) },
  );

  const formsDisplayData = forms.currentData?.items;

  // Inbox list
  const [status, setStatus] = useState<RentalApplicationStatus | "">("");
  const [appsLimit, setAppsLimit] = useState(50);
  const appsPager = useCursorPagination(pmCursorKey(ownerId, status, formId, appsLimit));
  const applications = useListApplicationsQuery(
    {
      owner_id: ownerId,
      status: status || undefined,
      form_id: formId ?? undefined,
      limit: appsLimit,
      cursor: appsPager.cursor},
    { skip: tab !== "inbox" || (role === "agent" && !ownerId) },
  );

  const appsDisplayData = applications.currentData?.items;
  const inboxScopeKey = pmCursorKey(ownerId, status, formId, appsLimit, appsPager.cursor);

  const [decideApplication, decideState] = useDecideApplicationMutation();

  // Confirmation dialog state for approve/reject actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "reject";
    applicationId: number | null;
    applicantName: string;
  }>({ open: false, type: "approve", applicationId: null, applicantName: "" });
  const [decisionNotes, setDecisionNotes] = useState("");

  const handleDecisionConfirm = useCallback(async () => {
    if (!confirmDialog.applicationId || !appsDisplayData?.some((app) => app.id === confirmDialog.applicationId)) return;
    const decision = confirmDialog.type === "approve" ? "approved" : "rejected";
    try {
      await decideApplication({
        application_id: confirmDialog.applicationId,
        payload: { decision, notes: decisionNotes.trim() || undefined }}).unwrap();
      toast({
        title: confirmDialog.type === "approve" ? "Approved" : "Rejected",
        description: `Application ${decision}.`});
      setConfirmDialog({
        open: false,
        type: "approve",
        applicationId: null,
        applicantName: ""});
      setDecisionNotes("");
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: getErrorMessage(
          e,
          `Could not ${confirmDialog.type} application.`,
        ),
        variant: "destructive"});
    }
  }, [
    appsDisplayData,
    confirmDialog.applicationId,
    confirmDialog.type,
    decideApplication,
    decisionNotes,
    toast,
  ]);

  useEffect(() => {
    setConfirmDialog({ open: false, type: "approve", applicationId: null, applicantName: "" });
    setDecisionNotes("");
  }, [inboxScopeKey]);

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
        <PageHeader
          title="Applications"
          description="Create forms, share links, and process submissions."
          icon={ClipboardList}
          actions={
            <CreateApplicationFormDialog
              key={ownerId ?? 'all'}
              ownerId={ownerId}
              isAgentWithoutOwner={role === "agent" && !ownerId}
            />
          }
        />

        <div className="inline-flex flex-wrap gap-1 rounded-cohere-md border border-cohere-card-border bg-card/40 p-1 backdrop-blur-md">
          <button
            type="button"
            className={`rounded-cohere-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "forms"
                ? "bg-accent/70 text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("forms")}
          >
            Forms
          </button>
          <button
            type="button"
            className={`rounded-cohere-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "inbox"
                ? "bg-accent/70 text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("inbox")}
          >
            Inbox
          </button>
        </div>

        <ApplicationTable
          key={tab === "inbox" ? inboxScopeKey : "forms"}
          tab={tab}
          formsData={formsDisplayData}
          formsIsLoading={(!forms.currentData && forms.isFetching)}
          formsIsError={forms.isError}
          formsRefetch={() => { void forms.refetch() }}
          formsLimit={formsLimit}
          formsCanPrev={formsPager.canPrev}
          formsCanNext={forms.currentData?.has_more ?? false}
          onFormsPrev={formsPager.prev}
          onFormsNext={() => forms.currentData && formsPager.next(forms.currentData.next_cursor)}
          formsQ={formsQ}
          onFormsQChange={setFormsQ}
          formsLimitValue={formsLimit}
          onFormsLimitChange={setFormsLimit}
          toast={toast}
          applicationsData={appsDisplayData}
          applicationsIsLoading={!applications.currentData && applications.isFetching}
          applicationsIsError={applications.isError}
          applicationsRefetch={() => { void applications.refetch() }}
          appsLimit={appsLimit}
          appsCanPrev={appsPager.canPrev}
          appsCanNext={applications.currentData?.has_more ?? false}
          onAppsPrev={appsPager.prev}
          onAppsNext={() => applications.currentData && appsPager.next(applications.currentData.next_cursor)}
          status={status}
          onStatusChange={setStatus}
          formId={formId}
          onClearForm={clearFormFilter}
          appsLimitValue={appsLimit}
          onAppsLimitChange={setAppsLimit}
          decideIsLoading={decideState.isLoading}
          onApprove={(app) => openConfirmDialog("approve", app)}
          onReject={(app) => openConfirmDialog("reject", app)}
        />
      </div>

      {/* Confirmation Dialog for Approve/Reject */}
      <AlertDialog
        open={confirmDialog.open && Boolean(appsDisplayData?.some((app) => app.id === confirmDialog.applicationId))}
        onOpenChange={(open) => {
          if (!open && !decideState.isLoading) {
            setConfirmDialog({
              open: false,
              type: "approve",
              applicationId: null,
              applicantName: ""});
            setDecisionNotes("");
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
          <div className="space-y-2">
            <Label htmlFor="decision-notes">Notes (optional)</Label>
            <Textarea
              id="decision-notes"
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              disabled={decideState.isLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decideState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void handleDecisionConfirm(); }}
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
