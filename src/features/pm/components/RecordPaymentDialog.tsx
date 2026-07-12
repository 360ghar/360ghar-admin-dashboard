import { useState } from "react";
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

  const amountPaid = form.watch("amount_paid");
  const exceedsOutstanding = Number(amountPaid) > outstanding;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setReceipt(null);
    }
    onOpenChange(next);
  };

  const onSubmit = async (values: PmRentPaymentForm) => {
    if (!chargeId) return;
    if (Number(values.amount_paid) > outstanding) {
      toast({
        title: "Invalid amount",
        description: `Amount paid (${formatCurrency(values.amount_paid)}) exceeds outstanding (${formatCurrency(outstanding)}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      let receiptDocumentId: number | undefined;
      if (receipt && charge) {
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
      }

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
      handleOpenChange(false);
    } catch (e: unknown) {
      applyServerValidation(e, form.setError);
      toast({
        title: "Failed",
        description: getErrorMessage(e, "Could not record payment."),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <div className="text-sm text-muted-foreground">
              Charge #{chargeId} &bull; Outstanding: {formatCurrency(outstanding)}
            </div>
            {exceedsOutstanding && (
              <p className="text-sm text-destructive">
                Amount paid exceeds outstanding balance.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="0" {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label>Receipt file (optional)</Label>
                <Input
                  type="file"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordState.isLoading || uploadDocState.isLoading || exceedsOutstanding}
              >
                {recordState.isLoading || uploadDocState.isLoading
                  ? "Saving…"
                  : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
