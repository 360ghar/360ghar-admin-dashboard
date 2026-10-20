import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useEffect, useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, IndianRupee } from "lucide-react";
import { downloadCsv } from "@/features/pm/utils";
import { PAYMENT_METHODS, getStatusLabel } from "@/features/pm/constants";
import { formatCurrency } from "@/lib/format"
import { formatDate, formatDateTime } from "@/lib/format";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import GenerateChargesDialog from "@/features/pm/components/GenerateChargesDialog";
import ChargesTab from "@/features/pm/components/ChargesTab";
import PaymentsTab from "@/features/pm/components/PaymentsTab";
import RecordPaymentDialog from "@/features/pm/components/RecordPaymentDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { RentChargeWithTotals, RentPayment, RentChargeStatus, RentPaymentStatus } from "@/types/pm";
import {
  useListRentChargesQuery,
  useListRentPaymentsQuery,
  useRejectRentPaymentMutation,
  useSettleRentPaymentMutation} from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import CountUp from "@/components/reactbits/CountUp";
import { PageHeader } from "@/components/ui/page-header";

export default function PmRentLedgerPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const ownerId = selectedOwnerId;

  const [tab, setTab] = useState<"charges" | "payments">("charges");
  const [chargeStatus, setChargeStatus] = useState<RentChargeStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<RentPaymentStatus | "">("");
  const [limit, setLimit] = useState(50);
  const { toast } = useToast();
  const [settlePayment] = useSettleRentPaymentMutation();
  const [rejectPayment] = useRejectRentPaymentMutation();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<RentChargeWithTotals | null>(null);

  const openPayment = (charge: RentChargeWithTotals) => {
    setSelectedCharge(charge);
    setPaymentOpen(true);
  };

  const chargesPager = useCursorPagination(pmCursorKey(ownerId, chargeStatus, limit));
  const paymentsPager = useCursorPagination(pmCursorKey(ownerId, paymentStatus, limit));

  const charges = useListRentChargesQuery(
    { owner_id: ownerId, status: chargeStatus || undefined, limit, cursor: chargesPager.cursor },
    { skip: role === "agent" && !ownerId },
  );

  const chargesDisplayData = charges.currentData?.items;

  const payments = useListRentPaymentsQuery(
    { owner_id: ownerId, status: paymentStatus || undefined, limit, cursor: paymentsPager.cursor },
    { skip: role === "agent" && !ownerId },
  );

  const paymentsDisplayData = payments.currentData?.items;

  // A charge selected under another owner, status, or page cannot receive a payment.
  const activeCharge = selectedCharge && (!ownerId || selectedCharge.charge.owner_id === ownerId)
    ? chargesDisplayData?.find((item) => item.charge.id === selectedCharge.charge.id) ?? null
    : null;
  useEffect(() => {
    setSelectedCharge(null);
    setPaymentOpen(false);
  }, [ownerId, chargeStatus, limit, chargesPager.cursor]);

  const chargeTotals = useMemo(() => {
    const items = chargesDisplayData ?? [];
    return {
      due: items.reduce((sum, c) => sum + c.amount_due_total, 0),
      paid: items.reduce((sum, c) => sum + c.amount_paid_total, 0),
      outstanding: items.reduce((sum, c) => sum + c.outstanding, 0),
    };
  }, [chargesDisplayData]);

  const chargeColumns = useMemo<ColumnDef<RentChargeWithTotals>[]>(() => {
    return [
      {
        id: "billing",
        header: "Billing Month",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium">
              {formatDate(row.original.charge.billing_month)}
            </div>
            <div className="text-xs text-muted-foreground">
              Due {formatDate(row.original.charge.due_date)}
            </div>
          </div>
        )},
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.charge.status}</Badge>
        )},
      {
        id: "due",
        header: "Due",
        cell: ({ row }) => (
          <span className="text-sm">{formatCurrency(row.original.amount_due_total)}</span>
        )},
      {
        id: "late_fee",
        header: "Late fee",
        cell: ({ row }) => (
          <span className={row.original.charge.late_fee_assessed ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
            {row.original.charge.late_fee_assessed ? formatCurrency(row.original.charge.late_fee_assessed) : "—"}
          </span>
        )},
      {
        id: "paid",
        header: "Paid",
        cell: ({ row }) => (
          <span className="text-sm">{formatCurrency(row.original.amount_paid_total)}</span>
        )},
      {
        id: "outstanding",
        header: "Outstanding",
        cell: ({ row }) => (
          <span className={row.original.outstanding > 0 ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
            {formatCurrency(row.original.outstanding)}
          </span>
        )},
    ];
  }, []);

  const paymentColumns = useMemo<ColumnDef<RentPayment>[]>(() => {
    return [
      {
        accessorKey: "paid_at",
        header: "Paid at",
        cell: ({ row }) => formatDateTime(row.original.paid_at)},
      {
        accessorKey: "amount_paid",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount_paid)},
      {
        accessorKey: "status",
        header: "Status",
        // A tenant claim is pending until the owner settles it. Only settled payments count as income.
        cell: ({ row }) => (
          <Badge variant={row.original.status === "settled" ? "default" : "secondary"}>{row.original.status}</Badge>
        )},
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => getStatusLabel(PAYMENT_METHODS, row.original.payment_method)},
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => row.original.reference || "—"},
      {
        id: "charge",
        header: "Charge",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            Charge #{row.original.charge_id} &bull; Lease #{row.original.lease_id}
          </span>
        )},
      {
        id: "receipt",
        header: "Receipt",
        cell: ({ row }) =>
          row.original.receipt_document_id ? (
            <Badge variant="outline">Doc #{row.original.receipt_document_id}</Badge>
          ) : (
            "—"
          )},
      {
        // A tenant claim waits for staff: settle it (it then counts toward the charge) or reject it.
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-end gap-2">
              <ConfirmAlertDialog
                title="Settle payment"
                description={`Confirm the ${formatCurrency(row.original.amount_paid)} payment for charge #${row.original.charge_id}? It then counts toward the charge.`}
                confirmLabel="Settle"
                onConfirm={async () => {
                  await settlePayment(row.original.id).unwrap();
                  toast({ title: "Settled", description: "Payment settled." });
                }}
              >
                {(openDialog) => (
                  <Button size="sm" onClick={openDialog}>
                    Settle
                  </Button>
                )}
              </ConfirmAlertDialog>
              <ConfirmAlertDialog
                title="Reject payment"
                description={`Reject the ${formatCurrency(row.original.amount_paid)} claim for charge #${row.original.charge_id}? The claim is removed and the charge stays unchanged.`}
                confirmLabel="Reject"
                variant="destructive"
                onConfirm={async () => {
                  await rejectPayment(row.original.id).unwrap();
                  toast({ title: "Rejected", description: "Payment claim rejected." });
                }}
              >
                {(openDialog) => (
                  <Button size="sm" variant="destructive" onClick={openDialog}>
                    Reject
                  </Button>
                )}
              </ConfirmAlertDialog>
            </div>
          ) : null},
    ];
    // The dialogs live in the cells: keep this dependency list free of request state, or a cell remounts
    // while its dialog is open and the dialog loses its error message.
  }, [settlePayment, rejectPayment, toast]);

  const goPrev = () => chargesPager.prev();
  const goPrevPayments = () => paymentsPager.prev();

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Rent Ledger"
          description="Generate charges, record payments and receipts, and settle tenant claims."
          icon={IndianRupee}
          actions={<GenerateChargesDialog key={ownerId ?? 'all'} ownerId={ownerId} />}
        />

        <div className="inline-flex flex-wrap gap-1 rounded-cohere-md border border-cohere-card-border bg-card/40 p-1 backdrop-blur-md">
          <button
            type="button"
            className={`rounded-cohere-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "charges"
                ? "bg-accent/70 text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("charges")}
          >
            Charges
          </button>
          <button
            type="button"
            className={`rounded-cohere-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "payments"
                ? "bg-accent/70 text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("payments")}
          >
            Payments
          </button>
        </div>

        {tab === "charges" && chargesDisplayData?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
              <div className="text-xs font-medium text-muted-foreground">Total due</div>
              <CountUp
                to={chargeTotals.due}
                duration={1.2}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-semibold tracking-tight tabular-nums"
              />
              <div className="mt-0.5 text-xs text-muted-foreground">Current page</div>
            </div>
            <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
              <div className="text-xs font-medium text-muted-foreground">Total paid</div>
              <CountUp
                to={chargeTotals.paid}
                duration={1.2}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-semibold tracking-tight tabular-nums"
              />
              <div className="mt-0.5 text-xs text-muted-foreground">Current page</div>
            </div>
            <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 backdrop-blur-md">
              <div className="text-xs font-medium text-muted-foreground">Outstanding</div>
              <CountUp
                to={chargeTotals.outstanding}
                duration={1.2}
                format={(n) => formatCurrency(n)}
                className="text-2xl font-semibold tracking-tight tabular-nums"
              />
              <div className="mt-0.5 text-xs text-muted-foreground">Current page</div>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{tab === "charges" ? "Charges" : "Payments"}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (tab === "charges") {
                  const rows = (chargesDisplayData || []).map((c) => ({
                    charge_id: c.charge.id,
                    billing_month: c.charge.billing_month,
                    due_date: c.charge.due_date,
                    status: c.charge.status,
                    late_fee_assessed: c.charge.late_fee_assessed,
                    amount_due_total: c.amount_due_total,
                    amount_paid_total: c.amount_paid_total,
                    outstanding: c.outstanding,
                    property_id: c.charge.property_id,
                    lease_id: c.charge.lease_id}));
                  downloadCsv(`rent_charges_${new Date().toISOString().slice(0, 10)}.csv`, rows);
                } else {
                  const rows = (paymentsDisplayData || []).map((p) => ({
                    payment_id: p.id,
                    paid_at: p.paid_at,
                    amount_paid: p.amount_paid,
                    status: p.status,
                    method: p.payment_method,
                    reference: p.reference,
                    notes: p.notes,
                    charge_id: p.charge_id,
                    lease_id: p.lease_id,
                    property_id: p.property_id,
                    receipt_document_id: p.receipt_document_id}));
                  downloadCsv(`rent_payments_${new Date().toISOString().slice(0, 10)}.csv`, rows);
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export current page CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tab === "charges" ? (
              <ChargesTab
                charges={{ isLoading: (!charges.currentData && charges.isFetching), isError: charges.isError, error: charges.error, refetch: () => { void charges.refetch() }, data: chargesDisplayData }}
                chargeColumns={chargeColumns}
                chargeStatus={chargeStatus}
                onChargeStatusChange={setChargeStatus}
                limit={limit}
                onLimitChange={setLimit}
                canPrev={chargesPager.canPrev}
                canNext={charges.currentData?.has_more ?? false}
                onPrev={goPrev}
                onNext={() => charges.currentData && chargesPager.next(charges.currentData.next_cursor)}
                onRecordPayment={openPayment}
              />
            ) : (
              <PaymentsTab
                payments={{ isLoading: (!payments.currentData && payments.isFetching), isError: payments.isError, error: payments.error, refetch: () => { void payments.refetch() }, data: paymentsDisplayData }}
                paymentColumns={paymentColumns}
                paymentStatus={paymentStatus}
                onPaymentStatusChange={setPaymentStatus}
                limit={limit}
                canPrev={paymentsPager.canPrev}
                canNext={payments.currentData?.has_more ?? false}
                onPrev={goPrevPayments}
                onNext={() => payments.currentData && paymentsPager.next(payments.currentData.next_cursor)}
              />
            )}
          </CardContent>
        </Card>

        <RecordPaymentDialog
          ownerId={ownerId}
          charge={activeCharge}
          open={paymentOpen && Boolean(activeCharge)}
          onOpenChange={setPaymentOpen}
        />
      </div>
    </OwnerScopeGate>
  );
}
