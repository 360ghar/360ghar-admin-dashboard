import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCreateBlogTagMutation, useUpdateBlogTagMutation } from '@/features/blog/api/blogsApi'
import { blogTagSchema, type BlogTagForm } from '@/lib/blogValidation'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import type { BlogTag } from '@/types/blog'

interface TagFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTag?: BlogTag | null
  onSuccess: () => void
}

const TagFormDialog: React.FC<TagFormDialogProps> = ({ open, onOpenChange, editingTag, onSuccess }) => {
  const { toast } = useToast()
  const [createTag, { isLoading: isCreating }] = useCreateBlogTagMutation()
  const [updateTag, { isLoading: isUpdating }] = useUpdateBlogTagMutation()

  const form = useForm<BlogTagForm>({
    resolver: zodResolver(blogTagSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset(editingTag ? { name: editingTag.name } : { name: '' })
  }, [open, editingTag, form])

  const handleSubmit = async (data: BlogTagForm) => {
    form.clearErrors()
    try {
      if (editingTag) { await updateTag({ identifier: editingTag.id, data }).unwrap(); toast({ title: 'Success', description: 'Tag updated successfully' }) }
      else { await createTag(data).unwrap(); toast({ title: 'Success', description: 'Tag created successfully' }) }
      form.reset({ name: '' }); onSuccess()
    } catch (error: unknown) { applyServerValidation(error, form.setError); toast({ title: 'Error', description: getErrorMessage(error, `Failed to ${editingTag ? 'update' : 'create'} tag`), variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle></DialogHeader>
        <Form {...form}><form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
          <FormRootError form={form} />
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Tag name" {...field} disabled={isCreating || isUpdating} /></FormControl><FormMessage /></FormItem>)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || isUpdating}>{(isCreating || isUpdating) ? (editingTag ? 'Updating...' : 'Creating...') : (editingTag ? 'Update Tag' : 'Create Tag')}</Button>
          </div>
        </form></Form>
      </DialogContent>
    </Dialog>
  )
}

export default TagFormDialog
