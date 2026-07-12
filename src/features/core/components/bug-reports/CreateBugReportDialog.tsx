import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCreateBugReportMutation, useCreateBugReportWithMediaMutation } from '@/features/core/api/coreApi'
import { Plus } from 'lucide-react'
import { bugReportSchema, type BugReportFormData } from '@/features/core/validations'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import BugReportFormFields from './parts/BugReportFormFields'

const CreateBugReportDialog: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [createBugReport] = useCreateBugReportMutation()
  const [createBugReportWithMedia] = useCreateBugReportWithMediaMutation()

  const form = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: { source: 'web', bug_type: 'ui_bug', severity: 'medium', tags: [] },
  })

  const onSubmit = async (data: BugReportFormData) => {
    form.clearErrors()
    try {
      if (attachments.length > 0) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'device_info') formData.append(key, JSON.stringify(value))
          else if (key === 'tags' && Array.isArray(value)) formData.append(key, JSON.stringify(value))
          else formData.append(key, value as string)
        })
        attachments.forEach(file => formData.append('files', file))
        await createBugReportWithMedia(formData).unwrap()
      } else { await createBugReport(data).unwrap() }
      toast({ title: 'Bug Report Created', description: 'Thank you for reporting this issue. We will look into it.' })
      setIsOpen(false); form.reset(); setAttachments([]); onSuccess?.()
    } catch (error) { applyServerValidation(error, form.setError); toast({ title: 'Report Failed', description: getErrorMessage(error, 'Failed to create bug report. Please try again.'), variant: 'destructive' }) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]) }
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)) }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Report Bug</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Report a Bug</DialogTitle><DialogDescription>Help us improve by reporting issues you encounter</DialogDescription></DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
          <FormRootError form={form} />
          <BugReportFormFields form={form} attachments={attachments} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} removeAttachment={removeAttachment} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Submit Report</Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateBugReportDialog }
