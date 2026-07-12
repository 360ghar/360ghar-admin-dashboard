import {useMemo, useState} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderOpen, Trash2 } from "lucide-react";
import OwnerScopeGate from "@/features/pm/components/OwnerScopeGate";
import UploadDocumentDialog from "@/features/pm/components/UploadDocumentDialog";
import DocumentEditForm from "@/features/pm/components/DocumentEditForm";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSelector } from "@/hooks/redux";
import { selectSelectedOwnerId } from "@/features/pm/slices/pmSlice";
import type { Document, DocumentType } from "@/types/pm";
import {
  useListPmDocumentsQuery,
  useUpdatePmDocumentMutation,
  useDeletePmDocumentMutation} from "@/features/pm/api/pmApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

export default function PmDocumentsPage() {
  const { role } = useUserRole();
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { toast } = useToast();

  const ownerId = selectedOwnerId;
  const canUpload = role !== "admin" || Boolean(ownerId);

  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | "">("");
  const [limit, setLimit] = useState(50);

  const pager = useCursorPagination(`${docTypeFilter}|${limit}`);


  const docs = useListPmDocumentsQuery(
    { owner_id: ownerId, document_type: docTypeFilter || undefined, limit, cursor: pager.cursor },
    { skip: role === "agent" && !ownerId },
  );

  const [updateDoc, updateDocState] = useUpdatePmDocumentMutation();
  const [deleteDoc, deleteDocState] = useDeletePmDocumentMutation();

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
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={row.original.file_url} target="_blank" rel="noreferrer">
                View
              </a>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit document</DialogTitle>
                </DialogHeader>
                <DocumentEditForm
                  doc={row.original}
                  onSubmit={async (payload) => {
                    try {
                      await updateDoc({ document_id: row.original.id, payload }).unwrap();
                      toast({ title: "Updated", description: "Document updated." });
                    } catch (e: unknown) {
                      toast({ title: "Failed", description: getErrorMessage(e, "Could not update document."), variant: "destructive" });
                    }
                  }}
                  isSubmitting={updateDocState.isLoading}
                />
              </DialogContent>
            </Dialog>
            <ConfirmAlertDialog
              title="Delete Document"
              description={`Are you sure you want to delete "${row.original.title}"? This action cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await deleteDoc(row.original.id).unwrap();
                  toast({ title: "Deleted", description: "Document deleted." });
                } catch (e: unknown) {
                  toast({ title: "Failed", description: getErrorMessage(e, "Could not delete document."), variant: "destructive" });
                }
              }}
            >
              {(openDialog) => (
                <Button variant="destructive" size="sm" onClick={openDialog} disabled={deleteDocState.isLoading} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        )},
    ];
  }, [toast, updateDoc, updateDocState.isLoading, deleteDoc, deleteDocState.isLoading]);

  const docItems = docs.data?.items ?? [];

  return (
    <OwnerScopeGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">Upload, link, and manage sharing for documents.</p>
          </div>
          <UploadDocumentDialog ownerId={ownerId} canUpload={canUpload} />
        </div>
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
              <ErrorState title="Failed to load documents" onRetry={() => void docs.refetch()} />
            ) : docs.isLoading ? (
              <LoadingState type="spinner" />
            ) : docItems.length ? (
              <>
                <ResponsiveDataTable columns={columns} data={docItems} />
                <CursorPager
                  canPrev={pager.canPrev}
                  hasMore={docs.data?.has_more ?? false}
                  loading={docs.isFetching}
                  onPrev={pager.prev}
                  onNext={() => docs.data && pager.next(docs.data.next_cursor)}
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
