import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldX } from "lucide-react";
import { useTerminatePmLeaseMutation } from "@/features/pm/api/pmApi";
import { pmLeaseTerminateSchema, type PmLeaseTerminateForm } from "@/features/pm/validations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface TerminateLeaseDialogProps {
  leaseId: number;
  tenantName: string | undefined;
  canTerminate: boolean;
}

export default function TerminateLeaseDialog({
  leaseId,
  tenantName,
  canTerminate,
}: TerminateLeaseDialogProps) {
  const { toast } = useToast();
  const [terminateLease, terminateState] = useTerminatePmLeaseMutation();
  const [open, setOpen] = useState(false);

  const form = useForm<PmLeaseTerminateForm>({
    resolver: zodResolver(pmLeaseTerminateSchema),
    defaultValues: {
      termination_date: "",
      reason: "",
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        form.reset();
      }
    },
    [form],
  );

  const handleConfirm = useCallback(
    async (values: PmLeaseTerminateForm) => {
      try {
        await terminateLease({
          lease_id: leaseId,
          body: {
            termination_date: values.termination_date || undefined,
            reason: values.reason || undefined,
          },
        }).unwrap();
        toast({ title: "Terminated", description: "Lease terminated." });
      } catch (e: unknown) {
        toast({ title: "Failed", description: getErrorMessage(e, "Could not terminate lease."), variant: "destructive" });
      } finally {
        setOpen(false);
      }
    },
    [leaseId, terminateLease, toast],
  );

  return (
    <>
      <Button
        variant="destructive"
        disabled={!canTerminate || terminateState.isLoading}
        onClick={() => setOpen(true)}
      >
        <ShieldX className="mr-2 h-4 w-4" />
        Terminate
      </Button>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <Form {...form}>
            <AlertDialogHeader>
              <AlertDialogTitle>Terminate Lease</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to terminate this lease? This action will
                end the lease agreement for {tenantName || "the current tenant"} and cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="termination_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termination date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="e.g. Early move-out" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={terminateState.isLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void form.handleSubmit(handleConfirm)();
                }}
                disabled={terminateState.isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {terminateState.isLoading ? "Terminating…" : "Terminate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
