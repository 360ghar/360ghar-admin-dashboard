import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DocumentType, RentChargeWithTotals, RentPaymentCreate } from "@/types/pm";
import {
  useRecordRentPaymentMutation,
  useUploadPmDocumentMutation,
} from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { applyServerValidation } from "@/lib/formErrors";
import { FormRootError } from "@/components/ui/form-root-error";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS } from "@/features/pm/constants";
import {
  pmRentPaymentSchema,
  type PmRentPaymentForm,
} from "@/features/pm/validations";

interface RecordPaymentDialogProps {
  ownerId: number | null;
  charge: RentChargeWithTotals | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecordPaymentDialog({
  ownerId,
  charge,
  open,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const [recordPayment, recordState] = useRecordRentPaymentMutation();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{ file: File; chargeId: number; id: number } | null>(null);
  const [stage, setStage] = useState<"uploading" | "recording" | null>(null);
  const submitting = useRef(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<PmRentPaymentForm>({
    resolver: zodResolver(pmRentPaymentSchema),
    defaultValues: {
      amount_paid: "",
      payment_method: "cash",
      reference: "",
      notes: "",
    },
  });

  const chargeId = charge?.charge.id ?? null;
  const outstanding = charge?.outstanding ?? 0;
  const resetForm = form.reset;

  useEffect(() => {
    resetForm();
    setReceipt(null);
    setUploadedReceipt(null);
    setFileInputKey((key) => key + 1);
  }, [chargeId, ownerId, resetForm]);

  const handleOpenChange = (next: boolean) => {
    if (!next && submitting.current) return;
    if (!next) {
      form.reset();
      setReceipt(null);
      setUploadedReceipt(null);
      setFileInputKey((key) => key + 1);
    }
    onOpenChange(next);
  };

  const onSubmit = async (values: PmRentPaymentForm) => {
    if (!chargeId || submitting.current) return;
    // The amount is not capped here. The backend checks it against the balance, and that balance holds
    // a late fee that the daily job has not stored yet (the list does not show it). A payment above the
    // balance returns 400 "exceeds outstanding balance", which shows at the top of the form and in a toast.
    form.clearErrors();

    submitting.current = true;
    try {
      let receiptDocumentId = receipt && uploadedReceipt?.file === receipt && uploadedReceipt.chargeId === chargeId
        ? uploadedReceipt.id
        : undefined;
      if (receipt && charge) {
        if (receiptDocumentId === undefined) {
          setStage("uploading");
          const c = charge.charge;
          const fd = new FormData();
          fd.append("file", receipt);
          fd.append("document_type", "receipt" satisfies DocumentType);
          fd.append("title", `Rent receipt • charge #${chargeId}`);
          if (c?.owner_id) fd.append("owner_id", String(c.owner_id));
          else if (ownerId) fd.append("owner_id", String(ownerId));
          if (c?.property_id) fd.append("property_id", String(c.property_id));
          if (c?.lease_id) fd.append("lease_id", String(c.lease_id));
          fd.append("shared_with_agent", "true");
          fd.append("shared_with_tenant", "true");
          const doc = await uploadDoc(fd).unwrap();
          receiptDocumentId = doc.id;
          setUploadedReceipt({ file: receipt, chargeId, id: doc.id });
        }
      }

      setStage("recording");
      const payload: RentPaymentCreate = {
        charge_id: chargeId,
        amount_paid: Number(values.amount_paid),
        payment_method: values.payment_method,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
        receipt_document_id: receiptDocumentId,
      };
      await recordPayment(payload).unwrap();
      toast({ title: "Recorded", description: "Payment recorded." });
      submitting.current = false;
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({
        title: "Failed",
        description: getErrorMessage(e, "Could not record payment."),
        variant: "destructive",
      });
    } finally {
      submitting.current = false;
      setStage(null);
    }
  };

  const selectReceipt = (file: File | null, input: HTMLInputElement) => {
    if (file && file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20 MB.", variant: "destructive" });
      input.value = "";
      setReceipt(null);
      setUploadedReceipt(null);
      return;
    }
    const allowedType = !file || file.type.startsWith("image/") || [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type) || (file.type === "" && /\.(pdf|docx?|png|jpe?g|gif|webp|heic)$/i.test(file.name));
    if (!allowedType) {
      toast({ title: "Invalid file", description: "Choose an image, PDF, or Word document.", variant: "destructive" });
      input.value = "";
      setReceipt(null);
      setUploadedReceipt(null);
      return;
    }
    setReceipt(file);
    setUploadedReceipt(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription className="sr-only">Record a payment and attach an optional receipt.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <div className="text-sm text-muted-foreground">
              Charge #{chargeId} &bull; Outstanding: {formatCurrency(outstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              The balance can include a late fee that is not listed yet. The server checks the amount.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="0" disabled={Boolean(stage)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      disabled={Boolean(stage)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (optional)</FormLabel>
                    <FormControl>
                      <Input disabled={Boolean(stage)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label>Receipt file (optional)</Label>
                <Input
                  key={fileInputKey}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  disabled={Boolean(stage)}
                  onChange={(e) => selectReceipt(e.target.files?.[0] ?? null, e.target)}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input disabled={Boolean(stage)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {stage ? (
              <p role="status" className="text-sm text-muted-foreground">
                {stage === "uploading" ? "Uploading receipt…" : "Recording payment…"}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={Boolean(stage)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={Boolean(stage) || recordState.isLoading || uploadDocState.isLoading}
              >
                {stage === "uploading" ? "Uploading receipt…" : stage === "recording" ? "Recording…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
