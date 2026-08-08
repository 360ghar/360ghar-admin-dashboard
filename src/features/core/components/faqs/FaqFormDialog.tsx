import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { faqSchema, type FaqFormValues } from '@/features/core/validations'
import { useCreateFaqMutation, useUpdateFaqMutation, type Faq } from '@/features/core/api/coreApi'
import { useToast } from '@/hooks/use-toast'

interface FaqFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingFaq: Faq | null
  formData: FaqFormValues
  setFormData: React.Dispatch<React.SetStateAction<FaqFormValues>>
  onSuccess: () => void
}

const defaultFormData: FaqFormValues = {
  question: '',
  answer: '',
  category: '',
  tags: '',
  display_order: 0,
  is_active: true,
}

const FaqFormDialog: React.FC<FaqFormDialogProps> = ({ open, onOpenChange, editingFaq, formData, setFormData, onSuccess }) => {
  const { toast } = useToast()
  const [createFaq] = useCreateFaqMutation()
  const [updateFaq] = useUpdateFaqMutation()

  const form = useForm<FaqFormValues>({ resolver: zodResolver(faqSchema), defaultValues: formData })

  useEffect(() => {
    if (open) form.reset(formData)
  }, [open, form, formData])

  const onSubmit = async (values: FaqFormValues) => {
    form.clearErrors()
    const payload = {
      question: values.question,
      answer: values.answer,
      category: values.category?.trim() || null,
      tags: values.tags
        ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : null,
      display_order: values.display_order,
      is_active: values.is_active,
    }
    try {
      if (editingFaq) {
        await updateFaq({ id: editingFaq.id, data: payload }).unwrap()
        toast({ title: 'FAQ updated' })
      } else {
        await createFaq(payload).unwrap()
        toast({ title: 'FAQ created' })
      }
      setFormData(values)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      applyServerValidation(error, form.setError, { knownFields: ['question', 'answer', 'category', 'display_order'] })
      toast({ title: 'Failed to save FAQ', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingFaq ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          <DialogDescription>Questions appear in the apps’ help section.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. How do I schedule a visit?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Write the answer…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. bookings" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Comma-separated, e.g. payments, refunds" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Separate multiple tags with commas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-cohere-sm border border-cohere-card-border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Only active FAQs are shown publicly.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingFaq ? 'Save changes' : 'Create FAQ'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default FaqFormDialog
export type { FaqFormValues as FaqFormData }
export { defaultFormData }
