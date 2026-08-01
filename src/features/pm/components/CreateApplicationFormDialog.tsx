import { useState } from 'react'
import { safeJsonObject } from '@/lib/json'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import type { RentalApplicationFormCreate } from '@/types/pm'
import {
  useCreateApplicationFormMutation,
  useListPmPropertiesQuery,
} from '@/features/pm/api/pmApi'
import { Plus } from 'lucide-react'

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
  const [propertyId, setPropertyId] = useState<string>('')
  const [applicationFeeAmount, setApplicationFeeAmount] = useState('')
  const [questionsJson, setQuestionsJson] = useState('{}')

  const properties = useListPmPropertiesQuery(
    { owner_id: ownerId, limit: 200 },
    { skip: isAgentWithoutOwner },
  )

  const [createForm, createState] = useCreateApplicationFormMutation()

  const submitCreateForm = async () => {
    const questions = questionsJson ? safeJsonObject(questionsJson) : undefined
    if (questionsJson && questions === null) {
      toast({
        title: 'Invalid JSON',
        description: 'Questions must be a valid JSON object.',
        variant: 'destructive',
      })
      return
    }

    const selectedPropertyOwnerId = (properties.data?.items ?? []).find(
      (p) => String(p.id) === String(propertyId),
    )?.owner_id
    const effectiveOwnerId = ownerId ?? selectedPropertyOwnerId ?? null
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
      property_id: propertyId ? Number(propertyId) : undefined,
      title,
      description: description || undefined,
      application_fee_amount: applicationFeeAmount
        ? Number(applicationFeeAmount)
        : undefined,
      questions,
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
      setPropertyId('')
      setApplicationFeeAmount('')
      setQuestionsJson('{}')
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create application form</DialogTitle>
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
            <Select value={propertyId || 'any'} onValueChange={(v) => setPropertyId(v === 'any' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {properties.isLoading ? (
                  <SelectItem value="loading" disabled>Loading properties…</SelectItem>
                ) : properties.isError ? (
                  <SelectItem value="error" disabled>Failed to load properties</SelectItem>
                ) : (
                  (properties.data?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      #{p.id} • {p.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Application fee (optional)</Label>
            <Input
              value={applicationFeeAmount}
              onChange={(e) => setApplicationFeeAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Questions (JSON)</Label>
            <Textarea
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              rows={10}
            />
            <div className="text-xs text-muted-foreground">
              MVP stores answers JSON only. Build UI templates in Phase 2.
            </div>
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
