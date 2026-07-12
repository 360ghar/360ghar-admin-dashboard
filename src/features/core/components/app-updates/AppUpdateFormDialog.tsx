import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useCreateAppUpdateMutation, useUpdateAppUpdateMutation } from '@/features/core/api/coreApi'
import { useToast } from '@/hooks/use-toast'
import { appUpdateSchema, type AppUpdateFormValues } from '@/features/core/validations'
import type { AppUpdate } from '@/types/api'

interface AppUpdateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUpdate: AppUpdate | null
  formData: AppUpdateFormValues
  setFormData: React.Dispatch<React.SetStateAction<AppUpdateFormValues>>
  onSuccess: () => void
}

const defaultFormData: AppUpdateFormValues = { platform: 'ios', version: '', build_number: '', release_notes: '', download_url: '', is_mandatory: false, is_active: true, min_supported_version: '' }

const AppUpdateFormDialog: React.FC<AppUpdateFormDialogProps> = ({ open, onOpenChange, editingUpdate, formData, setFormData, onSuccess }) => {
  const { toast } = useToast()
  const [createUpdate, { isLoading: isCreating }] = useCreateAppUpdateMutation()
  const [updateUpdate, { isLoading: isUpdating }] = useUpdateAppUpdateMutation()

  const form = useForm<AppUpdateFormValues>({
    resolver: zodResolver(appUpdateSchema),
    defaultValues: formData,
  })

  useEffect(() => {
    if (open) form.reset(formData)
  }, [open, form, formData])

  const handleSubmit = async (values: AppUpdateFormValues) => {
    form.clearErrors()
    try {
      if (editingUpdate) {
        await updateUpdate({ id: editingUpdate.id, data: { version: values.version, build_number: Number(values.build_number), release_notes: values.release_notes, download_url: values.download_url, is_mandatory: values.is_mandatory, is_active: values.is_active, min_supported_version: values.min_supported_version } }).unwrap()
        toast({ title: 'Success', description: 'App update updated successfully' })
      } else {
        await createUpdate({ platform: values.platform, version: values.version, build_number: Number(values.build_number), release_notes: values.release_notes || '', download_url: values.download_url, is_mandatory: values.is_mandatory, is_active: values.is_active, min_supported_version: values.min_supported_version || undefined }).unwrap()
        toast({ title: 'Success', description: 'App update created successfully' })
      }
      setFormData(values)
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) { applyServerValidation(error, form.setError); toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save app update'), variant: 'destructive' }) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingUpdate ? 'Edit Update' : 'Create New Update'}</DialogTitle>
          <DialogDescription>{editingUpdate ? 'Update the application version information' : 'Create a new application update for users'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)} className="space-y-4">
            <FormRootError form={form} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="version" render={({ field }) => (
                <FormItem><FormLabel>Version *</FormLabel><FormControl><Input placeholder="1.0.0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="build_number" render={({ field }) => (
                <FormItem><FormLabel>Build Number *</FormLabel><FormControl><Input placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem><FormLabel>Platform</FormLabel><Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="android">Android</SelectItem><SelectItem value="ios">iOS</SelectItem><SelectItem value="web">Web</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="min_supported_version" render={({ field }) => (
                <FormItem><FormLabel>Min Supported Version</FormLabel><FormControl><Input placeholder="1.0.0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="download_url" render={({ field }) => (
              <FormItem><FormLabel>Download URL *</FormLabel><FormControl><Input placeholder="https://example.com/app.apk" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="release_notes" render={({ field }) => (
              <FormItem><FormLabel>Release Notes</FormLabel><FormControl><Textarea placeholder="Detailed release notes..." rows={6} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex items-center justify-between">
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center space-x-2"><FormControl><Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label htmlFor="is_active">Active Update</Label></FormItem>
              )} />
              <FormField control={form.control} name="is_mandatory" render={({ field }) => (
                <FormItem className="flex items-center space-x-2"><FormControl><Switch id="is_mandatory" checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label htmlFor="is_mandatory">Mandatory</Label></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? 'Saving...' : (editingUpdate ? 'Update' : 'Create')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AppUpdateFormDialog
export type { AppUpdateFormValues as AppUpdateFormData }
export { defaultFormData }
