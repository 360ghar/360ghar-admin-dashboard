import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ShieldCheck, ShieldX } from "lucide-react";
import { DecisionAlertDialog } from "@/features/pm/components/DecisionAlertDialog";
import DocumentViewButton from "@/features/pm/components/DocumentViewButton";
import {
  useGetApplicationQuery,
  useListPmDocumentsQuery,
} from "@/features/pm/api/pmApi";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import { useAppSelector } from "@/hooks/redux";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";

export default function PmApplicationDetailPage() {
  const { applicationId } = useParams();
  const applicationIdNum = Number(applicationId);
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { role } = useUserRole();

  const application = useGetApplicationQuery(applicationIdNum, {
    skip: !applicationIdNum,
  });

  const docs = useListPmDocumentsQuery(
    {
      owner_id: application.currentData?.owner_id ?? undefined,
      rental_application_id: applicationIdNum,
      limit: 50,
    },
    { skip: !application.currentData?.owner_id || Boolean(selectedOwnerId && application.currentData.owner_id !== selectedOwnerId) },
  );

  const answersJson = useMemo(() => {
    if (!application.currentData?.answers) return null;
    try {
      return JSON.stringify(application.currentData.answers, null, 2);
    } catch {
      return null;
    }
  }, [application.currentData?.answers]);

  if (!applicationIdNum || Number.isNaN(applicationIdNum)) {
    return <EmptyState title="Invalid application id" />;
  }

  if (application.isError) {
    return (
      <ErrorState
        error={application.error}
        onRetry={() => { void application.refetch(); }}
      />
    );
  }

  if ((!application.currentData && application.isFetching)) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((role === "agent" && !selectedOwnerId) || (selectedOwnerId && application.currentData && application.currentData.owner_id !== selectedOwnerId)) {
    return <EmptyState title="Application is outside the selected owner" description="Select the application owner to view this record." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Application #${application.currentData?.id ?? applicationIdNum}`}
        description={`Form #${application.currentData?.form_id} • ${application.currentData?.property_name || `Property #${application.currentData?.property_id}`}`}
        breadcrumbs={[
          { label: "Applications", to: "/pm/applications" },
          { label: `Application #${application.currentData?.id ?? applicationIdNum}` },
        ]}
        actions={
          application.currentData ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{application.currentData.status}</Badge>
              <DecisionAlertDialog
                applicationId={applicationIdNum}
                applicantName={application.currentData?.applicant_full_name ?? undefined}
                renderTrigger={({ openApprove, openReject, isLoading }) => (
                  <>
                    <Button
                      size="sm"
                      disabled={isLoading || application.currentData?.status === "approved"}
                      onClick={openApprove}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isLoading || application.currentData?.status === "rejected"}
                      onClick={openReject}
                    >
                      <ShieldX className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
              />
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {application.currentData ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{application.currentData.applicant_full_name || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{application.currentData.applicant_phone || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{application.currentData.applicant_email || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Property</span>
                  <span className="text-right font-medium">
                    {application.currentData.property_name || `#${application.currentData.property_id}`}
                    {application.currentData.property_address ? (
                      <span className="block text-xs font-normal text-muted-foreground">{application.currentData.property_address}</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">
                    {application.currentData.submitted_at ? formatDateTime(application.currentData.submitted_at) : "—"}
                  </span>
                </div>
                {application.currentData.decision_at ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Decided</span>
                    <span className="font-medium">{formatDateTime(application.currentData.decision_at)}</span>
                  </div>
                ) : null}
                {application.currentData.decision_notes ? (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Decision notes</span>
                    <span className="text-right font-medium">{application.currentData.decision_notes}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState title="Application not found" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/pm/leases">Create lease</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to={`/pm/properties/${application.currentData?.property_id ?? ""}`}>
                Open property
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          {answersJson ? (
            <pre className="max-h-[520px] overflow-auto rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 text-xs backdrop-blur-md">
              {answersJson}
            </pre>
          ) : (
            <EmptyState title="No answers" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {docs.isError ? (
            <ErrorState
              title="Failed to load documents"
              error={docs.error}
              onRetry={() => { void docs.refetch(); }}
            />
          ) : (!docs.currentData && docs.isFetching) ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : docs.currentData?.items?.length ? (
            <div className="space-y-2">
              {docs.currentData.items.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {d.document_type} &bull; Doc #{d.id}
                    </div>
                  </div>
                  <DocumentViewButton fileUrl={d.file_url} icon={<FileText className="mr-2 h-4 w-4" />} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No documents linked" />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
