import { Link, useParams } from "react-router-dom";
import UploadSignedDialog from "@/features/pm/components/UploadSignedDialog";
import RenewLeaseDialog from "@/features/pm/components/RenewLeaseDialog";
import TerminateLeaseDialog from "@/features/pm/components/TerminateLeaseDialog";
import { useGetPmLeaseQuery } from "@/features/pm/api/pmApi";
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

  const lease = useGetPmLeaseQuery(leaseIdNum, { skip: !leaseIdNum });

  const canTerminate = lease.data?.status !== "terminated";

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

  if (lease.isLoading) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Lease #${lease.data?.id ?? leaseIdNum}`}
        description={`Property #${lease.data?.property_id} • Owner #${lease.data?.owner_id}`}
        breadcrumbs={[
          { label: "Leases", to: "/pm/leases" },
          { label: `Lease #${lease.data?.id ?? leaseIdNum}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {lease.data ? <Badge variant="secondary">{lease.data.status}</Badge> : null}
            {lease.data ? (
              <UploadSignedDialog
                leaseId={lease.data.id}
                ownerId={lease.data.owner_id}
                propertyId={lease.data.property_id}
              />
            ) : null}
            {lease.data ? (
              <RenewLeaseDialog leaseId={lease.data.id} />
            ) : null}
            <TerminateLeaseDialog
              leaseId={leaseIdNum}
              tenantName={lease.data?.tenant_name ?? undefined}
              canTerminate={canTerminate}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lease.data ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-medium">
                    {lease.data.tenant_name || lease.data.tenant_phone || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-medium">
                    {formatDate(lease.data.start_date)} →{" "}
                    {formatDate(lease.data.end_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly rent</span>
                  <span className="font-medium">
                    {formatCurrency(lease.data.monthly_rent)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Security deposit</span>
                  <span className="font-medium">
                    {formatCurrency(lease.data.security_deposit)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due day</span>
                  <span className="font-medium">{lease.data.payment_due_day}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grace period</span>
                  <span className="font-medium">{lease.data.grace_period_days} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lease document</span>
                  {lease.data.lease_document_id ? (
                    <span className="font-medium">Document #{lease.data.lease_document_id}</span>
                  ) : (
                    <span className="text-muted-foreground">Not uploaded</span>
                  )}
                </div>
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
            {lease.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : lease.data ? (
              <>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={`/pm/properties/${lease.data.property_id}`}>Open property</Link>
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
