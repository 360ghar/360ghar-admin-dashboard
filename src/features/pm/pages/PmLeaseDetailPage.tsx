import { Link, useParams } from "react-router-dom";
import UploadSignedDialog from "@/features/pm/components/UploadSignedDialog";
import RenewLeaseDialog from "@/features/pm/components/RenewLeaseDialog";
import TerminateLeaseDialog from "@/features/pm/components/TerminateLeaseDialog";
import { LEASE_STATUSES, RENEWABLE_LEASE_STATUSES, TERMINATABLE_LEASE_STATUSES, getStatusLabel } from "@/features/pm/constants";
import { useGetPmLeaseQuery } from "@/features/pm/api/pmApi";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useAppSelector } from "@/hooks/redux";
import { useUserRole } from "@/hooks/useUserRole";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";

export default function PmLeaseDetailPage() {
  const { leaseId } = useParams();
  const leaseIdNum = Number(leaseId);
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { role } = useUserRole();

  const lease = useGetPmLeaseQuery(leaseIdNum, { skip: !leaseIdNum });

  const canTerminate = lease.currentData ? TERMINATABLE_LEASE_STATUSES.includes(lease.currentData.status) : false;
  const canRenew = lease.currentData ? RENEWABLE_LEASE_STATUSES.includes(lease.currentData.status) : false;

  if (!leaseIdNum || Number.isNaN(leaseIdNum)) {
    return <EmptyState title="Invalid lease id" />;
  }

  if (lease.isError) {
    return (
      <ErrorState
        error={lease.error}
        onRetry={() => { void lease.refetch(); }}
      />
    );
  }

  if ((!lease.currentData && lease.isFetching)) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if ((role === "agent" && !selectedOwnerId) || (selectedOwnerId && lease.currentData && lease.currentData.owner_id !== selectedOwnerId)) {
    return <EmptyState title="Lease is outside the selected owner" description="Select the lease owner to view this record." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lease #${lease.currentData?.id ?? leaseIdNum}`}
        description={`Property #${lease.currentData?.property_id} • Owner #${lease.currentData?.owner_id}`}
        breadcrumbs={[
          { label: "Leases", to: "/pm/leases" },
          { label: `Lease #${lease.currentData?.id ?? leaseIdNum}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {lease.currentData ? <Badge variant="secondary">{getStatusLabel(LEASE_STATUSES, lease.currentData.status)}</Badge> : null}
            {lease.currentData ? (
              <UploadSignedDialog
                leaseId={lease.currentData.id}
                ownerId={lease.currentData.owner_id}
                propertyId={lease.currentData.property_id}
              />
            ) : null}
            {lease.currentData ? (
              <RenewLeaseDialog leaseId={lease.currentData.id} canRenew={canRenew} />
            ) : null}
            <TerminateLeaseDialog
              leaseId={leaseIdNum}
              tenantName={lease.currentData?.tenant_name ?? undefined}
              canTerminate={canTerminate}
            />
            {lease.currentData && !canTerminate && lease.currentData.status !== "terminated" ? (
              <span className="text-xs text-muted-foreground">
                Only active, expiring-soon, or pending-signature leases can be terminated.
              </span>
            ) : null}
            {lease.currentData && !canRenew ? (
              <span className="text-xs text-muted-foreground">
                Only active or expiring-soon leases can be renewed.
              </span>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lease.currentData ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-medium">
                    {lease.currentData.tenant_name || lease.currentData.tenant_phone || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-medium">
                    {formatDate(lease.currentData.start_date)} →{" "}
                    {formatDate(lease.currentData.end_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly rent</span>
                  <span className="font-medium">
                    {formatCurrency(lease.currentData.monthly_rent)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Security deposit</span>
                  <span className="font-medium">
                    {formatCurrency(lease.currentData.security_deposit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due day</span>
                  <span className="font-medium">{lease.currentData.payment_due_day}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grace period</span>
                  <span className="font-medium">{lease.currentData.grace_period_days} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Late fee</span>
                  <span className="font-medium">
                    {lease.currentData.late_fee_amount
                      ? `${formatCurrency(lease.currentData.late_fee_amount)} fixed`
                      : lease.currentData.late_fee_percentage
                        ? `${lease.currentData.late_fee_percentage}% of rent`
                        : "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lease document</span>
                  {lease.currentData.lease_document_id ? (
                    <span className="font-medium">Document #{lease.currentData.lease_document_id}</span>
                  ) : (
                    <span className="text-muted-foreground">Not uploaded</span>
                  )}
                </div>
                {lease.currentData.status === "terminated" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Terminated on</span>
                      <span className="font-medium">{formatDate(lease.currentData.termination_date, "—")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Termination reason</span>
                      <span className="font-medium">{lease.currentData.termination_reason || "—"}</span>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <EmptyState title="Lease not found" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!lease.currentData && lease.isFetching) ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : lease.currentData ? (
              <>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={`/pm/properties/${lease.currentData.property_id}`}>Open property</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/pm/rent-ledger">Open rent ledger</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/pm/documents">Open documents</Link>
                </Button>
              </>
            ) : (
              <EmptyState title="No quick links" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
