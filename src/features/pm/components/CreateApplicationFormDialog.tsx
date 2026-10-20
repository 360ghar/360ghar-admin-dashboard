import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import type { ApplicationFieldType, PmProperty, RentalApplicationFormCreate } from '@/types/pm'
import { useCreateApplicationFormMutation } from '@/features/pm/api/pmApi'
import { PmPropertyPicker } from '@/features/pm/components/PmPropertyPicker'
import { APPLICATION_FIELD_TYPES } from '@/features/pm/constants'
import { buildCustomFields, emptyFieldRow, type FieldRow } from '@/features/pm/applicationFields'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

interface CreateApplicationFormDialogProps {
  ownerId: number | null
  isAgentWithoutOwner: boolean
  onSuccess?: () => void
}

const CreateApplicationFormDialog: React.FC<CreateApplicationFormDialogProps> = ({
  ownerId,
  isAgentWithoutOwner,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('Rental Application')
  const [description, setDescription] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<PmProperty | null>(null)
  const [applicationFeeAmount, setApplicationFeeAmount] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [rows, setRows] = useState<FieldRow[]>([])
  const [nextKey, setNextKey] = useState(1)

  const [createForm, createState] = useCreateApplicationFormMutation()

  const updateRow = (key: number, patch: Partial<FieldRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const submitCreateForm = async () => {
    const built = buildCustomFields(rows)
    if ('error' in built) {
      toast({ title: 'Check the questions', description: built.error, variant: 'destructive' })
      return
    }

    const effectiveOwnerId = ownerId ?? selectedProperty?.owner_id ?? null
    if (!effectiveOwnerId) {
      toast({
        title: 'Select an owner',
        description: 'Choose an owner from the top bar or pick a property.',
        variant: 'destructive',
      })
      return
    }

    const payload: RentalApplicationFormCreate = {
      owner_id: effectiveOwnerId,
      property_id: selectedProperty?.id,
      title,
      description: description || undefined,
      application_fee_amount: applicationFeeAmount
        ? Number(applicationFeeAmount)
        : undefined,
      custom_fields: built.fields.length ? built.fields : undefined,
      expires_at: localInputToServerTimestamp(expiresAt) ?? undefined,
    }

    try {
      await createForm(payload).unwrap()
      toast({ title: 'Created', description: 'Application form created.' })
      setCreateOpen(false)
      onSuccess?.()
    } catch (e: unknown) {
      toast({
        title: 'Failed',
        description: getErrorMessage(e, 'Could not create form.'),
        variant: 'destructive',
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) {
      setTitle('Rental Application')
      setDescription('')
      setSelectedProperty(null)
      setApplicationFeeAmount('')
      setExpiresAt('')
      setRows([])
    }
  }

  return (
    <Dialog open={createOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create application form</DialogTitle>
          <DialogDescription className="sr-only">Set up an application form and its questions.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Property (optional)</Label>
            <PmPropertyPicker
              ownerId={ownerId}
              enabled={createOpen && !isAgentWithoutOwner}
              selected={selectedProperty}
              onSelect={setSelectedProperty}
              clearLabel="Any property"
            />
          </div>
          <div className="space-y-2">
            <Label>Application fee (optional)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={applicationFeeAmount}
              onChange={(e) => setApplicationFeeAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <div className="space-y-2">
            <Label>Closes at (optional)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows((current) => [...current, emptyFieldRow(nextKey)])
                  setNextKey((k) => k + 1)
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add question
              </Button>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No extra questions. The form still collects the applicant name, phone and email.
              </p>
            ) : null}
            {rows.map((row, index) => (
              <div key={row.key} className="grid gap-3 rounded-cohere-md border border-cohere-card-border p-3 md:grid-cols-[1fr_180px_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`question-label-${row.key}`}>Question {index + 1}</Label>
                  <Input
                    id={`question-label-${row.key}`}
                    value={row.label}
                    maxLength={200}
                    onChange={(e) => updateRow(row.key, { label: e.target.value })}
                    placeholder="e.g. Current employer"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Answer type</Label>
                  <Select
                    value={row.field_type}
                    onValueChange={(v) => updateRow(row.key, { field_type: v as ApplicationFieldType })}
                  >
                    <SelectTrigger aria-label={`Answer type of question ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={row.is_required}
                      onCheckedChange={(v) => updateRow(row.key, { is_required: v === true })}
                      aria-label={`Question ${index + 1} is required`}
                    />
                    Required
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {row.field_type === 'select' ? (
                  <div className="space-y-1 md:col-span-3">
                    <Label htmlFor={`question-options-${row.key}`}>Choices (one per line)</Label>
                    <Textarea
                      id={`question-options-${row.key}`}
                      rows={3}
                      value={row.options}
                      onChange={(e) => updateRow(row.key, { options: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => { void submitCreateForm() }}
            disabled={createState.isLoading}
          >
            {createState.isLoading ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CreateApplicationFormDialog }
