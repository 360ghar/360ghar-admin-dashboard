import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit, HelpCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { formatDate } from '@/lib/format'
import { faqSchema, type FaqFormValues } from '@/features/core/validations'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import {
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useGetFaqsQuery,
  useUpdateFaqMutation,
  type Faq,
} from '@/features/core/api/coreApi'

const defaultValues: FaqFormValues = {
  question: '',
  answer: '',
  category: '',
  tags: '',
  display_order: 0,
  is_active: true,
}

const FaqsManagementPage = () => {
  const { toast } = useToast()
  // Search is client-side over the current page only — don't put it in resetKey.
  const pager = useCursorPagination()
  const { data, isLoading, isError, refetch } = useGetFaqsQuery({
    cursor: pager.cursor,
    limit: 20,
  })
  const [createFaq] = useCreateFaqMutation()
  const [updateFaq] = useUpdateFaqMutation()
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation()

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Faq | null>(null)

  const form = useForm<FaqFormValues>({ resolver: zodResolver(faqSchema), defaultValues })

  const faqs = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = data?.items ?? []
    if (!term) return list
    return list.filter(
      (faq) =>
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term) ||
        (faq.category ?? '').toLowerCase().includes(term),
    )
  }, [data, search])

  const openCreate = () => {
    setEditing(null)
    form.reset(defaultValues)
    setDialogOpen(true)
  }

  const openEdit = (faq: Faq) => {
    setEditing(faq)
    form.reset({
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? '',
      tags: (faq.tags ?? []).join(', '),
      display_order: faq.display_order ?? 0,
      is_active: faq.is_active,
    })
    setDialogOpen(true)
  }

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
      if (editing) {
        await updateFaq({ id: editing.id, data: payload }).unwrap()
        toast({ title: 'FAQ updated' })
      } else {
        await createFaq(payload).unwrap()
        toast({ title: 'FAQ created' })
      }
      setDialogOpen(false)
    } catch (error) {
      applyServerValidation(error, form.setError, { knownFields: ['question', 'answer', 'category', 'display_order'] })
      toast({ title: 'Failed to save FAQ', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteFaq(id).unwrap()
      toast({ title: 'FAQ deleted' })
    } catch (error) {
      toast({ title: 'Failed to delete FAQ', description: getErrorMessage(error, 'Please try again.'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQs"
        description="Manage frequently asked questions shown in the apps."
        icon={HelpCircle}
        actions={
          <Button onClick={openCreate} className="rounded-cohere-pill">
            <Plus className="h-4 w-4" />
            New FAQ
          </Button>
        }
      />

      <Card className="rounded-cohere-md border-cohere-card-border">
        <CardContent className="pt-6">
          <Input
            placeholder="Search questions, answers or categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState type="card" rows={4} />
      ) : isError ? (
        <ErrorState title="Failed to load FAQs" onRetry={() => void refetch()} />
      ) : faqs.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-10 w-10" />}
          title={search ? 'No matching FAQs' : 'No FAQs yet'}
          description={search ? 'Try a different search term.' : 'Create your first FAQ to get started.'}
          action={search ? undefined : { label: 'New FAQ', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <Card key={faq.id} className="rounded-cohere-md border-cohere-card-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{faq.question}</h3>
                      {faq.category && <Badge variant="outline" className="capitalize">{faq.category}</Badge>}
                      {!faq.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{faq.answer}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Order: {faq.display_order}</span>
                      {faq.tags && faq.tags.length > 0 && <span>Tags: {faq.tags.join(', ')}</span>}
                      <span>Updated: {formatDate(faq.updated_at ?? faq.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(faq)} aria-label="Edit FAQ">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmAlertDialog
                      title="Delete FAQ"
                      description="Are you sure you want to delete this FAQ? This action cannot be undone."
                      confirmLabel="Delete"
                      variant="destructive"
                      onConfirm={() => void handleDelete(faq.id)}
                    >
                      {(openDialog) => (
                        <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting} aria-label="Delete FAQ">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </ConfirmAlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CursorPager
        hasMore={data?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(data?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isLoading}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {editing ? 'Save changes' : 'Create FAQ'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FaqsManagementPage
