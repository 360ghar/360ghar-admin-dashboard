import { useEffect, useState } from "react";
import type { Document, DocumentUpdate } from "@/types/pm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DocumentEditFormProps {
  doc: Document;
  onSubmit: (payload: DocumentUpdate) => Promise<void>;
  isSubmitting: boolean;
}

export default function DocumentEditForm({
  doc,
  onSubmit,
  isSubmitting,
}: DocumentEditFormProps) {
  const [title, setTitle] = useState(doc.title);
  const [shareAgent, setShareAgent] = useState(doc.shared_with_agent);
  const [shareTenant, setShareTenant] = useState(doc.shared_with_tenant);

  const changed = title.trim() !== doc.title || shareAgent !== doc.shared_with_agent || shareTenant !== doc.shared_with_tenant;

  useEffect(() => {
    setTitle(doc.title);
    setShareAgent(doc.shared_with_agent);
    setShareTenant(doc.shared_with_tenant);
  }, [doc]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!title.trim()} />
        {!title.trim() ? <p className="text-xs text-destructive">The title cannot be empty.</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            // PATCH: only the keys the user changed. The title cannot be empty.
            const payload: DocumentUpdate = {};
            if (title.trim() !== doc.title) payload.title = title.trim();
            if (shareAgent !== doc.shared_with_agent) payload.shared_with_agent = shareAgent;
            if (shareTenant !== doc.shared_with_tenant) payload.shared_with_tenant = shareTenant;
            void onSubmit(payload);
          }}
          disabled={isSubmitting || !title.trim() || !changed}
        >
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
