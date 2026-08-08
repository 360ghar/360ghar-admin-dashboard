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
import { useGetUserQuery, useUpdateUserMutation } from "@/features/users/api/usersApi";
import AssignAgent from "@/features/users/components/assign/AssignAgent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatNumber } from '@/lib/format'
import CountUp from '@/components/reactbits/CountUp'

const kycStatuses = ["unknown", "pending", "verified", "rejected"] as const;
type KycStatus = (typeof kycStatuses)[number];

export default function PmOwnerDetailPage() {
  const { ownerId } = useParams();
  const ownerUserId = Number(ownerId);
  const { role } = useUserRole();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

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

  const [updateUser, updateUserState] = useUpdateUserMutation();

  useEffect(() => {
    if (role === "agent" && owner.data) {
      dispatch(setSelectedOwner({ id: owner.data.id, label: owner.data.full_name || owner.data.phone || `Owner #${owner.data.id}` }));
    }
  }, [dispatch, owner.data, role]);

  const kycStatus: KycStatus = useMemo(() => {
    const prefs = owner.data?.preferences as unknown as Record<string, unknown> | undefined;
    const raw = prefs?.pm_kyc_status ?? prefs?.kyc_status;
    if (typeof raw === "string" && (kycStatuses as readonly string[]).includes(raw)) return raw as KycStatus;
    return "unknown";
  }, [owner.data?.preferences]);

  const setKycStatus = async (next: KycStatus) => {
    if (!owner.data) return;
    const currentPrefs = (owner.data.preferences as unknown as Record<string, unknown> | undefined) ?? {};
    try {
      await updateUser({
        id: owner.data.id,
        data: { preferences: { ...currentPrefs, pm_kyc_status: next } },
      }).unwrap();
      toast({ title: "Updated", description: "KYC status updated." });
    } catch (e: unknown) {
      toast({ title: "Failed", description: getErrorMessage(e, "Could not update KYC status."), variant: "destructive" });
    }
  };

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
            owner.isLoading
              ? "Loading…"
              : owner.data?.full_name || owner.data?.phone || `Owner #${ownerUserId}`
          }
          description="Owner portfolio overview and operations."
          icon={Users}
          breadcrumbs={[
            { label: "Owners", to: "/pm/owners" },
            { label: owner.data?.full_name || owner.data?.phone || `#${ownerUserId}` },
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Managed Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <CountUp
                  to={overview.data?.total_properties ?? 0}
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
              {overview.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CountUp
                  to={overview.data?.outstanding_rent_total ?? 0}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">KYC Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={kycStatus === "verified" ? "default" : kycStatus === "pending" ? "secondary" : "outline"}>
                {kycStatus}
              </Badge>
              {role === "admin" ? (
                <Select value={kycStatus} onValueChange={(v) => { void setKycStatus(v as KycStatus); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set KYC status" />
                  </SelectTrigger>
                  <SelectContent>
                    {kycStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-muted-foreground">Only admins can update KYC status.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {maintenance.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <CountUp
                  to={maintenance.data?.items?.length ?? 0}
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
              ) : activity.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : activity.data?.items?.length ? (
                <div className="space-y-2">
                  {activity.data.items.map((a, idx) => (
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
              {updateUserState.isLoading ? (
                <div className="text-xs text-muted-foreground">Updating KYC status…</div>
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
