import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCreateBlogCategoryMutation, useUpdateBlogCategoryMutation } from '@/features/blog/api/blogsApi'
import { blogCategorySchema, type BlogCategoryForm } from '@/lib/blogValidation'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import type { BlogCategory } from '@/types/blog'

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory?: BlogCategory | null
  onSuccess: () => void
}

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({ open, onOpenChange, editingCategory, onSuccess }) => {
  const { toast } = useToast()
  const [createCategory, { isLoading: isCreating }] = useCreateBlogCategoryMutation()
  const [updateCategory, { isLoading: isUpdating }] = useUpdateBlogCategoryMutation()

  const form = useForm<BlogCategoryForm>({
    resolver: zodResolver(blogCategorySchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      editingCategory
        ? { name: editingCategory.name, description: editingCategory.description || '' }
        : { name: '', description: '' },
    )
  }, [open, editingCategory, form])

  const handleSubmit = async (data: BlogCategoryForm) => {
    form.clearErrors()
    try {
      if (editingCategory) { await updateCategory({ identifier: editingCategory.id, data }).unwrap(); toast({ title: 'Success', description: 'Category updated successfully' }) }
      else { await createCategory(data).unwrap(); toast({ title: 'Success', description: 'Category created successfully' }) }
      form.reset({ name: '', description: '' }); onSuccess()
    } catch (error: unknown) { applyServerValidation(error, form.setError); toast({ title: 'Error', description: getErrorMessage(error, `Failed to ${editingCategory ? 'update' : 'create'} category`), variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle></DialogHeader>
        <Form {...form}><form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
          <FormRootError form={form} />
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Category name" {...field} disabled={isCreating || isUpdating} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Category description" {...field} disabled={isCreating || isUpdating} /></FormControl><FormMessage /></FormItem>)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || isUpdating}>{(isCreating || isUpdating) ? (editingCategory ? 'Updating...' : 'Creating...') : (editingCategory ? 'Update Category' : 'Create Category')}</Button>
          </div>
        </form></Form>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryFormDialog
