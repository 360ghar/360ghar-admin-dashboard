import type { Document } from "@/types/pm";
import DocumentViewButton from "@/features/pm/components/DocumentViewButton";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface KycDocumentsCardProps {
  kycDocs: {
    isLoading: boolean;
    isFetching: boolean;
    isError?: boolean;
    error?: unknown;
    refetch?: () => void;
    currentData?: { items: Document[] };
  };
}

export default function KycDocumentsCard({ kycDocs }: KycDocumentsCardProps) {
  const docs = kycDocs.currentData?.items ?? [];
  return (
    <>
      {kycDocs.isError ? (
        <ErrorState
          title="Failed to load KYC documents"
          error={kycDocs.error}
          onRetry={kycDocs.refetch ? () => { void kycDocs.refetch?.(); } : undefined}
        />
      ) : !kycDocs.currentData && kycDocs.isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : docs.length ? (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{d.title}</div>
                <div className="truncate text-xs text-muted-foreground">{d.document_type}</div>
              </div>
              <DocumentViewButton fileUrl={d.file_url} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No KYC documents" />
      )}
    </>
  );
}
