import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from '@/hooks/use-toast'
import { useGetBlogTagsQuery, useDeleteBlogTagMutation } from '@/features/blog/api/blogsApi'
import { Plus, Edit2, Trash2, Tag, FileText } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import type { BlogTag } from '@/types/blog'
import type { ColumnDef } from '@tanstack/react-table'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import TagFormDialog from '../../components/tag/TagFormDialog'

const TagsPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { data: tagsData, isFetching, error, refetch } = useGetBlogTagsQuery({ limit: 100 })
  const [deleteTag, { isLoading: isDeleting }] = useDeleteBlogTagMutation()

  const handleDeleteTag = useCallback(async (tag: BlogTag) => {
    try { await deleteTag(tag.id).unwrap(); toast({ title: 'Success', description: 'Tag deleted successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete tag'), variant: 'destructive' }) }
  }, [deleteTag])

  const openEditDialog = (tag: BlogTag) => { setEditingTag(tag); setIsEditDialogOpen(true) }

  const columns = useMemo<ColumnDef<BlogTag>[]>(() => [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'slug', header: 'Slug', cell: ({ row }) => <code className="rounded-cohere-xs border border-cohere-card-border bg-card/40 px-2 py-1 text-sm backdrop-blur-md">{row.original.slug}</code> },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const tag = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditDialog(tag)}><Edit2 className="h-4 w-4" /></Button>
            <ConfirmAlertDialog title="Delete Tag" description={`Are you sure you want to delete "${tag.name}"? This will remove the tag from all posts.`} confirmLabel="Delete" variant="destructive" onConfirm={() => handleDeleteTag(tag)}>
              {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
            </ConfirmAlertDialog>
          </div>
        )
      },
    },
  ], [isDeleting, handleDeleteTag])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Blog Tags"
        description="Manage blog tags for content labeling and organization"
        icon={Tag}
        badge="Admin View"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/blogs">
                <FileText className="h-4 w-4 mr-2" />
                Blog Posts
              </Link>
            </Button>
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Tag
            </Button>
          </div>
        }
      />
      <Card className="p-6">
        {isFetching ? <LoadingState type="card" rows={5} /> : error ? (
          <ErrorState title="Failed to load tags" error={error} onRetry={() => { void refetch() }} />
        ) : !tagsData?.items?.length ? (
          <EmptyState icon={<Tag className="h-12 w-12" />} title="No tags found" description="Create your first tag to label blog posts." action={{ label: 'New Tag', onClick: () => setIsCreateDialogOpen(true) }} />
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{tagsData.items.length} tags total</div>
            <DataTable columns={columns} data={tagsData.items} />
          </div>
        )}
      </Card>
      <TagFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={() => { setIsCreateDialogOpen(false); void refetch() }} />
      {editingTag && <TagFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} editingTag={editingTag} onSuccess={() => { setEditingTag(null); setIsEditDialogOpen(false); void refetch() }} />}
    </div>
  )
}

export default TagsPage
