import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDecideApplicationMutation } from "@/features/pm/api/pmApi";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface DecisionAlertDialogProps {
  applicationId: number;
  applicantName: string | undefined;
  onDecided?: () => void;
  renderTrigger: (props: { openApprove: () => void; openReject: () => void; isLoading: boolean }) => ReactNode;
}

export function DecisionAlertDialog({
  applicationId,
  applicantName,
  onDecided,
  renderTrigger,
}: DecisionAlertDialogProps) {
  const { toast } = useToast();
  const [decide, decideState] = useDecideApplicationMutation();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "reject";
  }>({ open: false, type: "approve" });
  const [notes, setNotes] = useState("");

  const handleConfirm = useCallback(async () => {
    const decision = confirmDialog.type === "approve" ? "approved" : "rejected";
    try {
      await decide({
        application_id: applicationId,
        payload: { decision, notes: notes.trim() || undefined },
      }).unwrap();
      toast({
        title: confirmDialog.type === "approve" ? "Approved" : "Rejected",
        description: `Application ${decision}.`,
      });
      onDecided?.();
      setConfirmDialog({ open: false, type: "approve" });
      setNotes("");
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: getErrorMessage(e, `Could not ${confirmDialog.type} application.`),
        variant: "destructive",
      });
    }
  }, [applicationId, confirmDialog.type, decide, notes, onDecided, toast]);

  const openApprove = () => setConfirmDialog({ open: true, type: "approve" });
  const openReject = () => setConfirmDialog({ open: true, type: "reject" });

  return (
    <>
      {renderTrigger({ openApprove, openReject, isLoading: decideState.isLoading })}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open && !decideState.isLoading) {
            setConfirmDialog({ open: false, type: "approve" });
            setNotes("");
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
                ? `Are you sure you want to approve this application for "${applicantName || "this applicant"}"?`
                : "Are you sure you want to reject this application? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-notes">Notes (optional)</Label>
            <Textarea
              id="decision-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={decideState.isLoading}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decideState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
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
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
