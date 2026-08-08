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
import { useGetBlogCategoriesQuery, useDeleteBlogCategoryMutation } from '@/features/blog/api/blogsApi'
import { Plus, Edit2, Trash2, Folder, FileText } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import type { BlogCategory } from '@/types/blog'
import type { ColumnDef } from '@tanstack/react-table'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import CategoryFormDialog from '../../components/category/CategoryFormDialog'

const CategoriesPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { data: categoriesData, isFetching, error, refetch } = useGetBlogCategoriesQuery({ limit: 100 })
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteBlogCategoryMutation()

  const handleDeleteCategory = useCallback(async (category: BlogCategory) => {
    try { await deleteCategory(category.id).unwrap(); toast({ title: 'Success', description: 'Category deleted successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete category'), variant: 'destructive' }) }
  }, [deleteCategory])

  const openEditDialog = (category: BlogCategory) => { setEditingCategory(category); setIsEditDialogOpen(true) }

  const columns = useMemo<ColumnDef<BlogCategory>[]>(() => [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'slug', header: 'Slug', cell: ({ row }) => <code className="rounded-cohere-xs border border-cohere-card-border bg-card/40 px-2 py-1 text-sm backdrop-blur-md">{row.original.slug}</code> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="max-w-xs truncate">{row.original.description || <span className="text-muted-foreground">No description</span>}</span> },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => formatDate(row.original.created_at) },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}><Edit2 className="h-4 w-4" /></Button>
            <ConfirmAlertDialog title="Delete Category" description={`Are you sure you want to delete "${category.name}"? This will remove the category from all posts.`} confirmLabel="Delete" variant="destructive" onConfirm={() => handleDeleteCategory(category)}>
              {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
            </ConfirmAlertDialog>
          </div>
        )
      },
    },
  ], [isDeleting, handleDeleteCategory])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Blog Categories"
        description="Manage blog categories for organizing content"
        icon={Folder}
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
              New Category
            </Button>
          </div>
        }
      />
      <Card className="p-6">
        {isFetching ? <LoadingState type="card" rows={5} /> : error ? (
          <ErrorState title="Failed to load categories" error={error} onRetry={() => { void refetch() }} />
        ) : !categoriesData?.items?.length ? (
          <EmptyState icon={<Folder className="h-12 w-12" />} title="No categories found" description="Create your first category to organize blog posts." action={{ label: 'New Category', onClick: () => setIsCreateDialogOpen(true) }} />
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{categoriesData.items.length} categories total</div>
            <DataTable columns={columns} data={categoriesData.items} />
          </div>
        )}
      </Card>
      <CategoryFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={() => { setIsCreateDialogOpen(false); void refetch() }} />
      {editingCategory && <CategoryFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} editingCategory={editingCategory} onSuccess={() => { setEditingCategory(null); setIsEditDialogOpen(false); void refetch() }} />}
    </div>
  )
}

export default CategoriesPage
