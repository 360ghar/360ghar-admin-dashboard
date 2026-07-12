import {useState} from 'react'
import { Plus, Edit, Eye, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useGetPagesQuery, useDeletePageMutation } from '@/features/core/api/coreApi'
import type { Page } from '@/types/api'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import PageFormDialog, { type PageFormData } from '../components/pages/PageFormDialog'
import PagePreviewDialog from '../components/pages/PagePreviewDialog'

const defaultFormData: PageFormData = { unique_name: '', title: '', content: '', format: 'html', custom_config_text: '', is_active: true, is_draft: false }

const PagesManagementPage: React.FC = () => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [formData, setFormData] = useState<PageFormData>({ ...defaultFormData })

  const pager = useCursorPagination(`${filterType}`)

  const { data: pagesData, isLoading, isError, refetch } = useGetPagesQuery({
    cursor: pager.cursor,
    limit: 20})
  const [deletePage, { isLoading: isDeleting }] = useDeletePageMutation()

  const pages = pagesData?.items ?? []
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.unique_name.toLowerCase().includes(searchTerm.toLowerCase())
    // Page.format is 'html' | 'markdown' (not CMS page "type").
    const matchesType = filterType === 'all' || page.format === filterType
    return matchesSearch && matchesType
  })

  const handleEdit = (page: Page) => {
    setEditingPage(page)
    setFormData({ unique_name: page.unique_name, title: page.title, content: page.content, format: page.format, custom_config_text: page.custom_config ? JSON.stringify(page.custom_config, null, 2) : '', is_active: page.is_active, is_draft: page.is_draft })
    setIsDialogOpen(true)
  }

  const handleDelete = async (uniqueName: string) => {
    try { await deletePage(uniqueName).unwrap(); toast({ title: 'Success', description: 'Page deleted successfully' }); void refetch() }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete page'), variant: 'destructive' }) }
  }

  const handlePreview = (page: Page) => {
    setEditingPage(page)
    setFormData({ unique_name: page.unique_name, title: page.title, content: page.content, format: page.format, custom_config_text: page.custom_config ? JSON.stringify(page.custom_config, null, 2) : '', is_active: page.is_active, is_draft: page.is_draft })
    setPreviewMode(true)
  }

  const resetForm = () => { setEditingPage(null); setFormData({ ...defaultFormData }); setPreviewMode(false) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages"
        description="Manage dynamic content pages"
        icon={FileText}
        actions={
          <Button className="rounded-cohere-pill" onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        }
      />
      <Card><CardContent className="pt-6">
        <div className="flex gap-4">
          <Input placeholder="Search pages..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>
      {isLoading ? <LoadingState type="card" rows={3} /> : isError ? (
        <ErrorState title="Failed to load pages" onRetry={() => void refetch()} />
      ) : !filteredPages.length ? (
        <EmptyState icon={<FileText className="h-10 w-10" />} title="No pages found" description="Create your first page to get started."
          action={{ label: 'New Page', onClick: () => { resetForm(); setIsDialogOpen(true) } }} />
      ) : (
        <div className="grid gap-4">{filteredPages.map((page) => (
          <Card key={page.unique_name}><CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><h3 className="font-semibold">{page.title}</h3><Badge variant="outline">{page.format}</Badge>{page.is_draft && <Badge variant="secondary">Draft</Badge>}</div>
                <p className="text-sm text-muted-foreground">/{page.unique_name}</p>
                <p className="text-sm line-clamp-2">{(page.content ?? '').replace(/<[^>]*>/g, '').substring(0, 150)}{(page.content?.length ?? 0) > 150 ? '...' : ''}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground"><span>Status: {page.is_active ? 'Active' : 'Inactive'}</span><span>Updated: {formatDate(page.updated_at)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreview(page)}><Eye className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(page)}><Edit className="h-4 w-4" /></Button>
                <ConfirmAlertDialog title="Delete Page" description="Are you sure you want to delete this page? This action cannot be undone." confirmLabel="Delete" variant="destructive" onConfirm={() => handleDelete(page.unique_name)}>
                  {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting}><X className="h-4 w-4" /></Button>}
                </ConfirmAlertDialog>
              </div>
            </div>
          </CardContent></Card>
        ))}</div>
      )}
      <CursorPager
        hasMore={pagesData?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(pagesData?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isLoading}
      />
      <PageFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} editingPage={editingPage} formData={formData} setFormData={setFormData} onSuccess={() => { setEditingPage(null); setFormData({ ...defaultFormData }); void refetch() }} />
      {previewMode && editingPage && <PagePreviewDialog open={previewMode} onOpenChange={setPreviewMode} title={formData.title} content={formData.content} uniqueName={formData.unique_name} format={formData.format} />}
    </div>
  )
}

export default PagesManagementPage
