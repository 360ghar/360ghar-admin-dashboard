import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useCreatePageMutation, useUpdatePageMutation } from '@/features/core/api/coreApi'
import { useToast } from '@/hooks/use-toast'
import { cmsPageSchema, type CmsPageFormValues } from '@/features/core/validations'
import type { Page, PageCreate, PageUpdate } from '@/types/api'

// Backwards-compatible alias used by the parent page; the canonical type
// now lives in @/features/core/validations as CmsPageFormValues.
type PageFormValues = CmsPageFormValues

interface PageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingPage: Page | null
  formData: PageFormValues
  setFormData: React.Dispatch<React.SetStateAction<PageFormValues>>
  onSuccess: () => void
}

const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const parseCustomConfig = (value?: string) => {
  if (!value) return undefined
  try { const parsed: unknown = JSON.parse(value); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown> } catch { return undefined }
  return undefined
}

const PageFormDialog: React.FC<PageFormDialogProps> = ({ open, onOpenChange, editingPage, formData, setFormData, onSuccess }) => {
  const { toast } = useToast()
  const [createPage, { isLoading: isCreating }] = useCreatePageMutation()
  const [updatePage, { isLoading: isUpdating }] = useUpdatePageMutation()

  const form = useForm<PageFormValues>({
    resolver: zodResolver(cmsPageSchema),
    defaultValues: formData,
  })

  useEffect(() => {
    if (open) form.reset(formData)
  }, [open, form, formData])

  const handleSubmit = async (values: PageFormValues) => {
    form.clearErrors()
    try {
      if (editingPage) {
        const updateData: PageUpdate = { title: values.title, content: values.content, format: values.format, is_active: values.is_active, is_draft: values.is_draft }
        const updateConfig = parseCustomConfig(values.custom_config_text)
        if (updateConfig) updateData.custom_config = updateConfig
        await updatePage({ uniqueName: editingPage.unique_name, data: updateData }).unwrap()
        toast({ title: 'Success', description: 'Page updated successfully' })
      } else {
        const createData: PageCreate = { unique_name: values.unique_name, title: values.title, content: values.content, format: values.format, is_active: values.is_active, is_draft: values.is_draft }
        const createConfig = parseCustomConfig(values.custom_config_text)
        if (createConfig) createData.custom_config = createConfig
        await createPage(createData).unwrap()
        toast({ title: 'Success', description: 'Page created successfully' })
      }
      setFormData(values)
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) { applyServerValidation(error, form.setError); toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save page'), variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPage ? 'Edit Page' : 'Create New Page'}</DialogTitle>
          <DialogDescription>{editingPage ? 'Update the page content and metadata' : 'Create a new content page for the application'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="Enter page title" {...field} onChange={(e) => { field.onChange(e); if (!editingPage) form.setValue('unique_name', generateSlug(e.target.value)) }} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unique_name" render={({ field }) => (
                <FormItem><FormLabel>Unique Name *</FormLabel><FormControl><Input placeholder="privacy-policy" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="format" render={({ field }) => (
                <FormItem><FormLabel>Format</FormLabel><Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="html">HTML</SelectItem><SelectItem value="markdown">Markdown</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div />
            </div>
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem><FormLabel>Content *</FormLabel><FormControl><Textarea placeholder="Enter page content (supports HTML)" rows={10} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="custom_config_text" render={({ field }) => (
              <FormItem><FormLabel>Custom Config (JSON)</FormLabel><FormControl><Textarea placeholder='{ "show_footer": true }' rows={4} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center space-x-2"><FormControl><input type="checkbox" id="is_active" checked={field.value} onChange={field.onChange} className="h-4 w-4" /></FormControl><Label htmlFor="is_active">This page is active</Label></FormItem>
              )} />
              <FormField control={form.control} name="is_draft" render={({ field }) => (
                <FormItem className="flex items-center space-x-2"><FormControl><input type="checkbox" id="is_draft" checked={field.value} onChange={field.onChange} className="h-4 w-4" /></FormControl><Label htmlFor="is_draft">Save as draft</Label></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? 'Saving...' : (editingPage ? 'Update' : 'Create')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default PageFormDialog
export type { PageFormValues as PageFormData }
