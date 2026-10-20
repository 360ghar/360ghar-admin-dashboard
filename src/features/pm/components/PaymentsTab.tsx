import type { ColumnDef } from "@tanstack/react-table";
import type { RentPayment, RentPaymentStatus } from "@/types/pm";
import { RENT_PAYMENT_STATUSES } from "@/features/pm/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import CursorPager from "@/components/ui/cursor-pager";

interface PaymentsTabProps {
  payments: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void; data?: RentPayment[] };
  paymentColumns: ColumnDef<RentPayment>[];
  /** Pending tenant claims wait for a staff decision: the filter finds them. */
  paymentStatus: RentPaymentStatus | "";
  onPaymentStatusChange: (status: RentPaymentStatus | "") => void;
  limit: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PaymentsTab({
  payments,
  paymentColumns,
  paymentStatus,
  onPaymentStatusChange,
  limit: _limit,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: PaymentsTabProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          value={paymentStatus || "all"}
          onValueChange={(v) => onPaymentStatusChange(v === "all" ? "" : (v as RentPaymentStatus))}
        >
          <SelectTrigger aria-label="Payment status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {RENT_PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {payments.isError ? (
        <ErrorState error={payments.error} onRetry={payments.refetch} />
      ) : payments.isLoading ? (
        <LoadingState type="spinner" />
      ) : payments.data?.length ? (
        <>
          <ResponsiveDataTable columns={paymentColumns} data={payments.data} />
          <CursorPager canPrev={canPrev} hasMore={canNext} onPrev={onPrev} onNext={onNext} />
        </>
      ) : (
        <EmptyState title="No payments" description="Record a payment or adjust the filter." />
      )}
    </>
  );
}
