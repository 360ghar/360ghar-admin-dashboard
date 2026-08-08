import { useMemo, useState } from 'react'
import { Edit, HelpCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useDeleteFaqMutation, useGetFaqsQuery, type Faq } from '@/features/core/api/coreApi'
import FaqFormDialog, { defaultFormData, type FaqFormData } from '@/features/core/components/faqs/FaqFormDialog'

const FaqsManagementPage = () => {
  const { toast } = useToast()
  // Search is client-side over the current page only — don't put it in resetKey.
  const pager = useCursorPagination()
  const { data, isLoading, isError, refetch } = useGetFaqsQuery({
    cursor: pager.cursor,
    limit: 20,
  })
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation()

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null)
  const [formData, setFormData] = useState<FaqFormData>(defaultFormData)

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
    setEditingFaq(null)
    setFormData({ ...defaultFormData })
    setDialogOpen(true)
  }

  const openEdit = (faq: Faq) => {
    setEditingFaq(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? '',
      tags: (faq.tags ?? []).join(', '),
      display_order: faq.display_order ?? 0,
      is_active: faq.is_active,
    })
    setDialogOpen(true)
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

      <FaqFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingFaq={editingFaq}
        formData={formData}
        setFormData={setFormData}
        onSuccess={() => setEditingFaq(null)}
      />
    </div>
  )
}

export default FaqsManagementPage
