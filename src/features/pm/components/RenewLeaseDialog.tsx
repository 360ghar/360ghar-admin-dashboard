import { useCallback, useState } from "react";
import type { LeaseRenew } from "@/types/pm";
import { useRenewPmLeaseMutation } from "@/features/pm/api/pmApi";
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
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

interface RenewLeaseDialogProps {
  leaseId: number;
  /** Only an active or expiring-soon lease can be renewed. The backend returns 400 for any other status. */
  canRenew: boolean;
}

export default function RenewLeaseDialog({ leaseId, canRenew }: RenewLeaseDialogProps) {
  const { toast } = useToast();
  const [renewLease, renewState] = useRenewPmLeaseMutation();

  const [open, setOpen] = useState(false);
  const [renewStart, setRenewStart] = useState("");
  const [renewEnd, setRenewEnd] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [renewDeposit, setRenewDeposit] = useState("");
  const [makeActive, setMakeActive] = useState<"yes" | "no">("no");

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRenewStart("");
      setRenewEnd("");
      setRenewRent("");
      setRenewDeposit("");
      setMakeActive("no");
    }
  }, []);

  const submit = async () => {
    if (!renewStart || !renewEnd) {
      toast({ title: "Missing fields", description: "Start and end dates are required.", variant: "destructive" });
      return;
    }
    if (new Date(renewEnd) <= new Date(renewStart)) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }
    const payload: LeaseRenew = {
      start_date: renewStart,
      end_date: renewEnd,
      monthly_rent: renewRent ? Number(renewRent) : null,
      security_deposit: renewDeposit ? Number(renewDeposit) : null,
      make_active: makeActive === "yes",
    };

    try {
      await renewLease({ lease_id: leaseId, payload }).unwrap();
      toast({ title: "Renewed", description: "New lease created." });
      setOpen(false);
    } catch (e: unknown) {
      toast({ title: "Failed", description: getErrorMessage(e, "Could not renew lease."), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!canRenew}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Renew
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Renew lease</DialogTitle>
          <DialogDescription className="sr-only">Enter the dates and optional terms of the new lease.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={renewStart} onChange={(e) => setRenewStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={renewEnd} onChange={(e) => setRenewEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Monthly rent (optional)</Label>
            <Input type="number" min={0} step="0.01" value={renewRent} onChange={(e) => setRenewRent(e.target.value)} placeholder="e.g. 27000" />
          </div>
          <div className="space-y-2">
            <Label>Security deposit (optional)</Label>
            <Input type="number" min={0} step="0.01" value={renewDeposit} onChange={(e) => setRenewDeposit(e.target.value)} placeholder="e.g. 50000" />
          </div>
          <p className="text-xs text-muted-foreground md:col-span-2">
            The new lease keeps the due day, grace period and late fee of this lease.
          </p>
          <div className="space-y-2 md:col-span-2">
            <Label>Make active</Label>
            <Select value={makeActive} onValueChange={(v) => setMakeActive(v as "yes" | "no")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No (draft)</SelectItem>
                <SelectItem value="yes">Yes (active)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => { void submit(); }} disabled={renewState.isLoading}>
            {renewState.isLoading ? "Renewing…" : "Renew"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
