import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogClose } from '@/components/ui/dialog'
import type { BugReport, BugReportUpdate } from '@/types/api'

const BugReportUpdateForm: React.FC<{ bugReport: BugReport; onSubmit: (data: BugReportUpdate) => void }> = ({ bugReport, onSubmit }) => {
  const { control, register, handleSubmit, formState: { isSubmitting } } = useForm<BugReportUpdate>({
    defaultValues: {
      status: bugReport.status,
      assigned_to: bugReport.assigned_to ?? null,
      resolution: bugReport.resolution || '',
    },
  })

  // Status never goes out as null (422). Blank assignee and resolution go out as null so they clear.
  const submit = (values: BugReportUpdate) =>
    onSubmit({
      status: values.status ?? bugReport.status,
      assigned_to: values.assigned_to ?? null,
      resolution: values.resolution?.trim() ? values.resolution : null,
    })

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-1">
        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned_to">Assigned To (admin or agent user ID)</Label>
        <Input
          id="assigned_to"
          type="number"
          {...register('assigned_to', {
            setValueAs: (value) => (value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value)),
          })}
          placeholder="Enter user ID"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resolution">Resolution Notes</Label>
        <Textarea
          id="resolution"
          {...register('resolution')}
          placeholder="Add resolution notes or comments..."
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Updating...' : 'Update Report'}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
      </div>
    </form>
  )
}

export { BugReportUpdateForm }
