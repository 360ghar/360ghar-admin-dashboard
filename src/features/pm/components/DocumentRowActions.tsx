import { useState } from "react";
import type { Document } from "@/types/pm";
import { useUpdatePmDocumentMutation } from "@/features/pm/api/pmApi";
import DocumentEditForm from "@/features/pm/components/DocumentEditForm";
import DocumentViewButton from "@/features/pm/components/DocumentViewButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

/**
 * View and edit of one document row. It is a component, not table cell code: a table cell that reads
 * request state forces the column list to change, which remounts the cell and closes its open dialog.
 * The backend has no document DELETE.
 */
export default function DocumentRowActions({ doc }: { doc: Document }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [updateDoc, updateState] = useUpdatePmDocumentMutation();

  return (
    <div className="flex justify-end gap-2">
      <DocumentViewButton fileUrl={doc.file_url} />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Edit</Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
            <DialogDescription className="sr-only">Change the title and who the document is shared with.</DialogDescription>
          </DialogHeader>
          <DocumentEditForm
            doc={doc}
            onSubmit={async (payload) => {
              try {
                await updateDoc({ document_id: doc.id, payload }).unwrap();
                toast({ title: "Updated", description: "Document updated." });
                setEditOpen(false);
              } catch (e: unknown) {
                toast({ title: "Failed", description: getErrorMessage(e, "Could not update document."), variant: "destructive" });
              }
            }}
            isSubmitting={updateState.isLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
