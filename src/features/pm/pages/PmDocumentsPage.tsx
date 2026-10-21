import { pmCursorKey } from '@/features/pm/hooks/pmCursorKey'
import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderOpen } from "lucide-react";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import UploadDocumentDialog from "@/features/pm/components/UploadDocumentDialog";
import DocumentRowActions from "@/features/pm/components/DocumentRowActions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { Document, DocumentType } from "@/types/pm";
import { useListPmDocumentsQuery } from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ResponsiveDataTable } from "@/components/ui/responsive-data-table";
import CursorPager from "@/components/ui/cursor-pager";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { DOCUMENT_TYPES, PAGE_SIZES } from "@/features/pm/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

export default function PmDocumentsPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);

  const ownerId = selectedOwnerId;
  const canUpload = role !== "admin" || Boolean(ownerId);

  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | "">("");
  const [limit, setLimit] = useState(50);

  const pager = useCursorPagination(pmCursorKey(ownerId, docTypeFilter, limit));


  const docs = useListPmDocumentsQuery(
    { owner_id: ownerId, document_type: docTypeFilter || undefined, limit, cursor: pager.cursor },
    { skip: role === "agent" && !ownerId },
  );

  const columns = useMemo<ColumnDef<Document>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: "Document",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.document_type} • Doc #{row.original.id}</div>
          </div>
        )},
      {
        id: "linked",
        header: "Linked",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.property_id ? `P#${row.original.property_id} ` : ""}
            {row.original.lease_id ? `L#${row.original.lease_id} ` : ""}
            {row.original.user_id ? `U#${row.original.user_id} ` : ""}
          </div>
        )},
      {
        id: "sharing",
        header: "Sharing",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.shared_with_agent ? "default" : "outline"}>agent</Badge>
            <Badge variant={row.original.shared_with_tenant ? "default" : "outline"}>tenant</Badge>
          </div>
        )},
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <DocumentRowActions doc={row.original} />},
    ];
  }, []);

  const docItems = docs.currentData?.items ?? [];

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Upload, link, and manage sharing for documents."
          icon={FolderOpen}
          actions={<UploadDocumentDialog key={ownerId ?? 'all'} ownerId={ownerId} canUpload={canUpload} />}
        />
        {role === "admin" && !ownerId ? (
          <div className="text-sm text-muted-foreground">
            Select an owner from the top bar to upload documents into the correct portfolio.
          </div>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Document Vault</CardTitle>
            <Badge variant="secondary" className="h-fit">
              <FolderOpen className="mr-1 h-3 w-3" />
              {docItems.length} shown
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={docTypeFilter || 'all'} onValueChange={(v) => setDocTypeFilter(v === 'all' ? '' : v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {docs.isError ? (
              <ErrorState title="Failed to load documents" error={docs.error} onRetry={() => void docs.refetch()} />
            ) : (!docs.currentData && docs.isFetching) ? (
              <LoadingState type="spinner" />
            ) : docItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={docItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={docs.currentData?.has_more ?? false}
                  loading={docs.isFetching}
                  onPrev={pager.prev}
                  onNext={() => docs.currentData && pager.next(docs.currentData.next_cursor)}
                />
              </>
            ) : (
              <EmptyState title="No documents" description="Upload a document to get started." />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  );
}
