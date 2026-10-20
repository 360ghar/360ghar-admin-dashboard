import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface DocumentViewButtonProps {
  /** The delivery URL for this viewer, or null when the viewer may not open the file. */
  fileUrl: string | null | undefined;
  icon?: ReactNode;
}

/** Open a PM document. The backend sends `file_url` only to a viewer who may open the file. */
export default function DocumentViewButton({ fileUrl, icon }: DocumentViewButtonProps) {
  if (!fileUrl) {
    return (
      <Button variant="outline" size="sm" disabled title="This file is not shared with you">
        No access
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <a href={fileUrl} target="_blank" rel="noreferrer">
        {icon}
        View
      </a>
    </Button>
  );
}
