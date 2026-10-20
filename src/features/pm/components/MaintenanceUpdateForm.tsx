import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { MaintenanceRequest, MaintenanceRequestUpdate } from "@/types/pm";
import { MAINTENANCE_REQUEST_STATUSES, MAINTENANCE_URGENCIES, WORK_ORDER_STATUSES } from "@/features/pm/constants";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { serverTimestampToLocalInput, localInputToServerTimestamp } from "@/lib/dateTime";
import { pmMaintenanceUpdateSchema, type PmMaintenanceUpdateForm } from "@/features/pm/validations";

interface MaintenanceUpdateFormProps {
  request: MaintenanceRequest;
  defaultAssignedAgentId: number | null;
  onSubmit: (payload: MaintenanceRequestUpdate) => Promise<void>;
  isSubmitting: boolean;
}

export default function MaintenanceUpdateForm({
  request,
  defaultAssignedAgentId,
  onSubmit,
  isSubmitting,
}: MaintenanceUpdateFormProps) {
  const form = useForm<PmMaintenanceUpdateForm>({
    resolver: zodResolver(pmMaintenanceUpdateSchema),
    defaultValues: {
      request_status: request.request_status,
      work_order_status: request.work_order_status || "",
      assign_to_me: defaultAssignedAgentId ? "yes" : "no",
      urgency: request.urgency,
      estimated_cost: request.estimated_cost != null ? String(request.estimated_cost) : "",
      actual_cost: request.actual_cost != null ? String(request.actual_cost) : "",
      scheduled_for: serverTimestampToLocalInput(request.scheduled_for),
      completion_notes: request.completion_notes || "",
      vendor_name: request.vendor_name || "",
      vendor_contact: request.vendor_contact || "",
    },
  });

  const handleSubmit = async (values: PmMaintenanceUpdateForm) => {
    // A field emptied in the form is sent as null to clear it. A field that was empty and stays empty is left out.
    const clearable = <T,>(next: T | undefined, previous: unknown): T | null | undefined =>
      next !== undefined ? next : previous != null ? null : undefined;
    const payload: MaintenanceRequestUpdate = {
      request_status: values.request_status,
      work_order_status: values.work_order_status || undefined,
      assigned_agent_id: values.assign_to_me === "yes" ? defaultAssignedAgentId ?? undefined : undefined,
      urgency: values.urgency,
      estimated_cost: clearable(values.estimated_cost ? Number(values.estimated_cost) : undefined, request.estimated_cost),
      actual_cost: clearable(values.actual_cost ? Number(values.actual_cost) : undefined, request.actual_cost),
      scheduled_for: clearable(localInputToServerTimestamp(values.scheduled_for) ?? undefined, request.scheduled_for),
      completion_notes: clearable(values.completion_notes || undefined, request.completion_notes),
      vendor_name: clearable(values.vendor_name || undefined, request.vendor_name),
      vendor_contact: clearable(values.vendor_contact || undefined, request.vendor_contact),
    };
    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="request_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MAINTENANCE_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="work_order_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work order status</FormLabel>
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {WORK_ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assign_to_me"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to me</FormLabel>
                {defaultAssignedAgentId ? (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">No agent available to assign</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urgency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MAINTENANCE_URGENCIES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimated_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated cost (optional)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actual_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual cost (optional)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduled_for"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Scheduled for (optional)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="completion_notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Completion notes (optional)</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor name (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. Singh Plumbing Co." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor contact (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. +91 98XXX XXXXX" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
