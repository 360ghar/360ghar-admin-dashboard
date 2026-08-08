import { useState } from "react";
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
import { FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { validateFileSize } from "@/lib/fileValidation";

interface UploadKycDialogProps {
  ownerUserId: number;
  disabled: boolean;
}

export default function UploadKycDialog({
  ownerUserId,
  disabled,
}: UploadKycDialogProps) {
  const { toast } = useToast();
  const [uploadDoc, uploadDocState] = useUploadPmDocumentMutation();

  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("id_proof");
  const [docTitle, setDocTitle] = useState("KYC Document");
  const [docFile, setDocFile] = useState<File | null>(null);

  const submit = async () => {
    if (!docFile) {
      toast({ title: "Missing file", description: "Choose a file to upload.", variant: "destructive" });
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", docFile);
      fd.append("document_type", docType);
      fd.append("title", docTitle);
      fd.append("owner_id", String(ownerUserId));
      fd.append("user_id", String(ownerUserId));
      fd.append("shared_with_agent", "true");
      await uploadDoc(fd).unwrap();
      toast({ title: "Uploaded", description: "Document uploaded successfully." });
      setOpen(false);
      setDocFile(null);
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: getErrorMessage(e, "Please try again."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <FileUp className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" aria-describedby="upload-kyc-desc">
        <DialogHeader>
          <DialogTitle>Upload KYC Document</DialogTitle>
        </DialogHeader>
        <p id="upload-kyc-desc" className="sr-only">Upload a KYC document with type and title.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_proof">ID Proof</SelectItem>
                <SelectItem value="address_proof">Address Proof</SelectItem>
                <SelectItem value="income_proof">Income Proof</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!validateFileSize(f, 20)) {
                e.target.value = "";
                return;
              }
              setDocFile(f);
            }} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => { void submit(); }}
              disabled={uploadDocState.isLoading || !docFile}
            >
              {uploadDocState.isLoading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
