import { useCallback, useState } from "react";
import type { DocumentType } from "@/types/pm";
import { useUploadPmDocumentMutation } from "@/features/pm/api/pmApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { validateFileSize } from "@/lib/fileValidation";

interface UploadDocumentDialogProps {
  ownerId: number | null;
  canUpload: boolean;
}

export default function UploadDocumentDialog({
  ownerId,
  canUpload,
}: UploadDocumentDialogProps) {
  const { toast } = useToast();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [userId, setUserId] = useState("");
  const [shareAgent, setShareAgent] = useState(true);
  const [shareTenant, setShareTenant] = useState(false);

  const resetState = useCallback(() => {
    setFile(null);
    setDocType("other");
    setTitle("");
    setPropertyId("");
    setLeaseId("");
    setUserId("");
    setShareAgent(true);
    setShareTenant(false);
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  }, [resetState]);

  const submit = async () => {
    if (!file || !title) {
      toast({ title: "Missing fields", description: "File and title are required.", variant: "destructive" });
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", docType);
      fd.append("title", title);
      if (ownerId) fd.append("owner_id", String(ownerId));
      if (propertyId) fd.append("property_id", propertyId);
      if (leaseId) fd.append("lease_id", leaseId);
      if (userId) fd.append("user_id", userId);
      fd.append("shared_with_agent", String(shareAgent));
      fd.append("shared_with_tenant", String(shareTenant));
      await uploadDoc(fd).unwrap();
      toast({ title: "Uploaded", description: "Document uploaded." });
      handleOpenChange(false);
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(e, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={!canUpload}>
          <FileUp className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="upload-doc-desc">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <p id="upload-doc-desc" className="sr-only">Upload a document file with type, title, and sharing preferences.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>File</Label>
            <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!validateFileSize(f, 20)) {
                e.target.value = "";
                return;
              }
              setFile(f);
            }} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease_agreement">lease_agreement</SelectItem>
                <SelectItem value="id_proof">id_proof</SelectItem>
                <SelectItem value="address_proof">address_proof</SelectItem>
                <SelectItem value="income_proof">income_proof</SelectItem>
                <SelectItem value="inspection_report">inspection_report</SelectItem>
                <SelectItem value="receipt">receipt</SelectItem>
                <SelectItem value="invoice">invoice</SelectItem>
                <SelectItem value="property_deed">property_deed</SelectItem>
                <SelectItem value="insurance_policy">insurance_policy</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Property ID (optional)</Label>
            <Input value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="e.g. 123" />
          </div>
          <div className="space-y-2">
            <Label>Lease ID (optional)</Label>
            <Input value={leaseId} onChange={(e) => setLeaseId(e.target.value)} placeholder="e.g. 55" />
          </div>
          <div className="space-y-2">
            <Label>User ID (optional)</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. owner user id" />
          </div>
          <div className="space-y-2">
            <Label>Share with agent</Label>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Agent can access</span>
              <Switch checked={shareAgent} onCheckedChange={setShareAgent} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Share with tenant</Label>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Tenant can access</span>
              <Switch checked={shareTenant} onCheckedChange={setShareTenant} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => { void submit(); }} disabled={uploadDocState.isLoading}>
            {uploadDocState.isLoading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
