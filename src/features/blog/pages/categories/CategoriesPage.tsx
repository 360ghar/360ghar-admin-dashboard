import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import CategoryFormDialog from '../../components/category/CategoryFormDialog'

const CategoriesPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { data: categoriesData, isFetching, error, refetch } = useGetBlogCategoriesQuery({ limit: 100 })
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteBlogCategoryMutation()

  const handleDeleteCategory = async (category: BlogCategory) => {
    try { await deleteCategory(category.id).unwrap(); toast({ title: 'Success', description: 'Category deleted successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete category'), variant: 'destructive' }) }
  }

  const openEditDialog = (category: BlogCategory) => { setEditingCategory(category); setIsEditDialogOpen(true) }

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
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{categoriesData.items.map((category: BlogCategory) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell><code className="rounded-cohere-xs border border-cohere-card-border bg-card/40 px-2 py-1 text-sm backdrop-blur-md">{category.slug}</code></TableCell>
                  <TableCell className="max-w-xs truncate">{category.description || <span className="text-muted-foreground">No description</span>}</TableCell>
                  <TableCell>{formatDate(category.created_at)}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}><Edit2 className="h-4 w-4" /></Button>
                    <ConfirmAlertDialog title="Delete Category" description={`Are you sure you want to delete "${category.name}"? This will remove the category from all posts.`} confirmLabel="Delete" variant="destructive" onConfirm={() => handleDeleteCategory(category)}>
                      {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
                    </ConfirmAlertDialog>
                  </div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </Card>
      <CategoryFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={() => { setIsCreateDialogOpen(false); void refetch() }} />
      {editingCategory && <CategoryFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} editingCategory={editingCategory} onSuccess={() => { setEditingCategory(null); setIsEditDialogOpen(false); void refetch() }} />}
    </div>
  )
}

export default CategoriesPage
