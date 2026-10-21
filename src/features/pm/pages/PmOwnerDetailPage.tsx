import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, Users, Wrench } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppDispatch } from "@/hooks/redux";
import { setSelectedOwner } from "@/features/pm/slices/pmSlice";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import KycDocumentsCard from "@/features/pm/components/KycDocumentsCard";
import UploadKycDialog from "@/features/pm/components/UploadKycDialog";
import { ActivityRow } from "@/features/pm/components/ActivityRow";
import {
  useGetPmDashboardActivityQuery,
  useGetPmDashboardOverviewQuery,
  useListMaintenanceRequestsQuery,
  useListPmDocumentsQuery,
} from "@/features/pm/api/pmApi";
import { formatDateTime } from "@/lib/format";
import { useGetUserQuery } from "@/features/users/api/usersApi";
import AssignAgent from "@/features/users/components/assign/AssignAgent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatNumber } from '@/lib/format'
import { getOwnerLabel } from "@/features/pm/utils";
import type { DocumentType } from "@/types/pm";
import CountUp from '@/components/reactbits/CountUp'

/** Document types an owner uploads as KYC. The user API stores no KYC status, so the documents are the record. */
const KYC_DOCUMENT_TYPES: readonly DocumentType[] = ["id_proof", "address_proof", "income_proof"];

export default function PmOwnerDetailPage() {
  const { ownerId } = useParams();
  const ownerUserId = Number(ownerId);
  const { role } = useUserRole();
  const dispatch = useAppDispatch();

  const owner = useGetUserQuery(ownerUserId, { skip: !ownerUserId });
  const overview = useGetPmDashboardOverviewQuery({ owner_id: ownerUserId }, { skip: !ownerUserId });
  const activity = useGetPmDashboardActivityQuery({ owner_id: ownerUserId, limit: 20 }, { skip: !ownerUserId });
  const maintenance = useListMaintenanceRequestsQuery(
    { owner_id: ownerUserId, limit: 10 },
    { skip: !ownerUserId },
  );
  const kycDocs = useListPmDocumentsQuery(
    { owner_id: ownerUserId, user_id: ownerUserId, limit: 10 },
    { skip: !ownerUserId },
  );

  useEffect(() => {
    if (role === "agent" && owner.currentData) {
      dispatch(setSelectedOwner({ id: owner.currentData.id, label: getOwnerLabel(owner.currentData) }));
    }
  }, [dispatch, owner.currentData, role]);

  const kycOnFile = useMemo(
    () => (kycDocs.currentData?.items ?? []).some((d) => KYC_DOCUMENT_TYPES.includes(d.document_type)),
    [kycDocs.currentData?.items],
  );

  if (!ownerUserId || Number.isNaN(ownerUserId)) {
    return <EmptyState title="Invalid owner id" />;
  }

  if (owner.isError) {
    return (
      <ErrorState
        title="Failed to load owner"
        error={owner.error}
        onRetry={() => { void owner.refetch(); }}
      />
    );
  }

  return (
    <OwnerScopeGate allowAllOwners>
      <div className="space-y-6">
        <PageHeader
          title={
            (!owner.currentData && owner.isFetching)
              ? "Loading…"
              : owner.currentData ? getOwnerLabel(owner.currentData) : `Owner #${ownerUserId}`
          }
          description="Owner portfolio overview and operations."
          icon={Users}
          breadcrumbs={[
            { label: "Owners", to: "/pm/owners" },
            { label: owner.currentData ? getOwnerLabel(owner.currentData) : `#${ownerUserId}` },
          ]}
          badge={role === "admin" ? "Admin view" : "Agent view"}
          actions={<Badge variant="outline">ID: {ownerUserId}</Badge>}
        />

        {overview.isError ? (
          <ErrorState
            title="Failed to load portfolio overview"
            error={overview.error}
            onRetry={() => { void overview.refetch(); }}
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {!overview.isError && <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Managed Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(!overview.currentData && overview.isFetching) ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <CountUp
                  to={overview.currentData?.total_properties ?? 0}
                  duration={1.2}
                  format={(n) => formatNumber(n)}
                  className="text-2xl font-semibold tracking-tight tabular-nums"
                />
              )}
              <Button asChild variant="link" className="h-auto p-0 text-xs mt-2">
                <Link to="/pm/properties">View properties</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Rent</CardTitle>
              <span className="text-muted-foreground">₹</span>
            </CardHeader>
            <CardContent>
              {(!overview.currentData && overview.isFetching) ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CountUp
                  to={overview.currentData?.outstanding_rent_total ?? 0}
                  duration={1.2}
                  format={(n) => formatCurrency(n)}
                  className="text-2xl font-semibold tracking-tight tabular-nums"
                />
              )}
              <Button asChild variant="link" className="h-auto p-0 text-xs mt-2">
                <Link to="/pm/rent-ledger">Open rent ledger</Link>
              </Button>
            </CardContent>
          </Card>
          </>}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">KYC</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {(!kycDocs.currentData && kycDocs.isFetching) ? (
                <Skeleton className="h-6 w-24" />
              ) : kycDocs.isError ? (
                <div className="text-xs text-muted-foreground">Could not load KYC documents.</div>
              ) : (
                <Badge variant={kycOnFile ? "default" : "outline"}>{kycOnFile ? "On file" : "None uploaded"}</Badge>
              )}
              <div className="text-xs text-muted-foreground">
                The user API stores no KYC status. Upload ID, address or income proof below.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {maintenance.isError ? (
                <ErrorState title="Failed to load maintenance" error={maintenance.error} onRetry={() => { void maintenance.refetch() }} />
              ) : (!maintenance.currentData && maintenance.isFetching) ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <CountUp
                  to={maintenance.currentData?.items?.length ?? 0}
                  duration={1.2}
                  format={(n) => formatNumber(n)}
                  className="text-2xl font-semibold tracking-tight tabular-nums"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">Recent (last 10)</p>
              <Button asChild variant="link" className="h-auto p-0 text-xs mt-2">
                <Link to="/pm/maintenance">View maintenance</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.isError ? (
                <ErrorState
                  title="Failed to load activity"
                  error={activity.error}
                  onRetry={() => { void activity.refetch(); }}
                />
              ) : (!activity.currentData && activity.isFetching) ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : activity.currentData?.items?.length ? (
                <div className="space-y-2">
                  {activity.currentData.items.map((a, idx) => (
                    <ActivityRow key={`${a.type}-${a.at}-${idx}`} activity={a} timestamp={formatDateTime(a.at)} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent activity" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>KYC Documents</CardTitle>
              <UploadKycDialog ownerUserId={ownerUserId} disabled={role !== "admin"} />
            </CardHeader>
            <CardContent className="space-y-2">
              <KycDocumentsCard kycDocs={kycDocs} />
              {role !== "admin" ? (
                <div className="text-xs text-muted-foreground">Only admins can upload KYC documents.</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle>Relationship Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignAgent userId={ownerUserId} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </OwnerScopeGate>
  );
}
