import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCompleteVisitMutation } from '@/features/visits/api/visitsApi'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useToast } from '@/hooks/use-toast'
import type { Visit } from '@/types/api'
import { completeVisitSchema, type CompleteVisitFormValues } from '@/features/visits/validations'

type CompleteVisitFormData = CompleteVisitFormValues

interface CompleteVisitDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CompleteVisitDialog: React.FC<CompleteVisitDialogProps> = ({
  visit,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const completeForm = useForm<CompleteVisitFormData>({
    resolver: zodResolver(completeVisitSchema),
  })

  useEffect(() => { if (open) completeForm.reset() }, [open, completeForm])

  const [completeVisit, { isLoading: completing }] = useCompleteVisitMutation()

  const handleSubmit = async (data: CompleteVisitFormData) => {
    if (!visit) return
    try {
      await completeVisit({ visitId: visit.id, ...data }).unwrap()
      toast({ title: 'Visit Completed', description: 'Visit has been marked as completed.' })
      onOpenChange(false)
      completeForm.reset()
      onSuccess?.()
    } catch (error) {
      applyServerValidation(error, completeForm.setError)
      toast({
        title: 'Update Failed',
        description: getErrorMessage(error, 'Failed to complete visit. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Visit</DialogTitle>
          <DialogDescription>Add notes and feedback for the completed visit</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void completeForm.handleSubmit(handleSubmit)(e)} className="space-y-4">
          <FormRootError form={completeForm} />
          <div className="space-y-2">
            <Label htmlFor="notes">Visit Notes</Label>
            <Textarea
              id="notes"
              {...completeForm.register('notes')}
              placeholder="Describe how the visit went..."
              rows={4}
            />
            {completeForm.formState.errors.notes && (
              <p className="text-sm text-destructive">{completeForm.formState.errors.notes.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              {...completeForm.register('feedback')}
              placeholder="Any additional feedback..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={completing} className="flex-1">
              {completing ? 'Completing...' : 'Complete Visit'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CompleteVisitDialog }
