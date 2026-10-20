import { useCallback, useState } from "react";
import type { DocumentType } from "@/types/pm";
import {
  useUploadPmDocumentMutation,
  useUploadSignedPmLeaseMutation,
} from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface UploadSignedDialogProps {
  leaseId: number;
  ownerId: number;
  propertyId: number;
}

export default function UploadSignedDialog({
  leaseId,
  ownerId,
  propertyId,
}: UploadSignedDialogProps) {
  const { toast } = useToast();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();
  const [uploadSigned, uploadSignedState] = useUploadSignedPmLeaseMutation();

  const [open, setOpen] = useState(false);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signedByOwner, setSignedByOwner] = useState<"yes" | "no">("yes");
  const [signedByTenant, setSignedByTenant] = useState<"yes" | "no">("no");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadedDocument, setUploadedDocument] = useState<{ file: File; leaseId: number; id: number } | null>(null);
  const [stage, setStage] = useState<"uploading" | "attaching" | null>(null);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (stage) return;
    setOpen(isOpen);
    if (!isOpen) {
      setSignedFile(null);
      setSignedByOwner("yes");
      setSignedByTenant("no");
      setUploadedDocument(null);
      setFileInputKey((k) => k + 1);
    }
  }, [stage]);

  const submit = async () => {
    if (!signedFile || stage) {
      if (stage) return;
      toast({ title: "Missing file", description: "Choose a signed lease PDF.", variant: "destructive" });
      return;
    }
    if (!signedFile.name.toLowerCase().endsWith(".pdf") || (signedFile.type && signedFile.type !== "application/pdf")) {
      toast({ title: "Invalid file", description: "Choose a PDF file.", variant: "destructive" });
      return;
    }
    if (signedFile.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "File must be under 10MB.", variant: "destructive" });
      return;
    }
    try {
      let documentId = uploadedDocument?.file === signedFile && uploadedDocument.leaseId === leaseId
        ? uploadedDocument.id
        : null;
      if (documentId === null) {
        setStage("uploading");
        const fd = new FormData();
        fd.append("file", signedFile);
        fd.append("document_type", "lease_agreement" satisfies DocumentType);
        fd.append("title", `Signed lease #${leaseId}`);
        fd.append("owner_id", String(ownerId));
        fd.append("property_id", String(propertyId));
        fd.append("lease_id", String(leaseId));
        fd.append("shared_with_agent", "true");
        fd.append("shared_with_tenant", "true");

        const doc = await uploadDoc(fd).unwrap();
        documentId = doc.id;
        setUploadedDocument({ file: signedFile, leaseId, id: documentId });
      }
      setStage("attaching");
      await uploadSigned({
        lease_id: leaseId,
        payload: {
          lease_document_id: documentId,
          signed_by_owner: signedByOwner === "yes",
          signed_by_tenant: signedByTenant === "yes",
        },
      }).unwrap();
      toast({ title: "Uploaded", description: "Signed lease attached." });
      setStage(null);
      setOpen(false);
      setSignedFile(null);
      setUploadedDocument(null);
      setFileInputKey((k) => k + 1);
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(e, "Please try again."), variant: "destructive" });
      setStage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Upload signed
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload signed lease</DialogTitle>
          <DialogDescription className="sr-only">Upload a signed lease PDF and attach it to this lease.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>PDF file</Label>
            <Input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              disabled={Boolean(stage)}
              onChange={(e) => {
                setSignedFile(e.target.files?.[0] ?? null);
                setUploadedDocument(null);
              }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Signed by owner</Label>
              <Select value={signedByOwner} onValueChange={(v) => setSignedByOwner(v as "yes" | "no")} disabled={Boolean(stage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Signed by tenant</Label>
              <Select value={signedByTenant} onValueChange={(v) => setSignedByTenant(v as "yes" | "no")} disabled={Boolean(stage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={Boolean(stage)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void submit();
              }}
              disabled={Boolean(stage) || uploadDocState.isLoading || uploadSignedState.isLoading || !signedFile}
            >
              {stage === "uploading" ? "Uploading document…" : stage === "attaching" ? "Attaching to lease…" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
