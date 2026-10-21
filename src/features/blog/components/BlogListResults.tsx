import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, Edit2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SortableHeader } from '@/components/ui/data-table'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useDeleteBlogPostMutation, useUpdateBlogPostMutation } from '@/features/blog/api/blogsApi'
import { toast } from '@/hooks/use-toast'
import type { BlogPost, BlogPostStatus } from '@/types/blog'
import { blogStatusBadgeClass, blogStatusLabel, resolveBlogStatus } from '@/features/blog/constants'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

interface BlogListResultsProps {
  posts: BlogPost[]
  viewStorageKey: string
}

/** Display rows and own the actions available on both table and mobile cards. */
export function BlogListResults({ posts, viewStorageKey }: BlogListResultsProps) {
  const [deleteBlogPost, { isLoading: isDeleting }] = useDeleteBlogPostMutation()
  const [updateBlogPost, { isLoading: isTogglingStatus }] = useUpdateBlogPostMutation()

  const handleDeletePost = useCallback(async (post: BlogPost) => {
    try {
      await deleteBlogPost(post.id).unwrap()
      toast({ title: 'Success', description: 'Blog post deleted successfully' })
    } catch (error: unknown) {
      // The confirmation must stay open so the user can retry.
      throw new Error(getErrorMessage(error, 'Failed to delete blog post'))
    }
  }, [deleteBlogPost])

  const handleToggleStatus = useCallback(async (post: BlogPost) => {
    const currentStatus = resolveBlogStatus(post)
    const nextStatus: BlogPostStatus = currentStatus === 'published' ? 'draft' : 'published'
    const isPublishing = nextStatus === 'published'
    try {
      await updateBlogPost({
        identifier: post.id,
        data: { status: nextStatus, scheduled_at: null },
      }).unwrap()
      toast({
        title: isPublishing ? 'Post published' : 'Post unpublished',
        description: isPublishing
          ? 'The blog post is now visible to users.'
          : 'The blog post has been moved back to drafts.',
      })
    } catch (error: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorMessage(error, 'Failed to update publish status'),
        variant: 'destructive',
      })
    }
  }, [updateBlogPost])

  const renderActions = useCallback((post: BlogPost) => {
    const isPublished = resolveBlogStatus(post) === 'published'
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild aria-label="View">
          <Link to={`/blogs/${post.slug}`}><Eye className="h-4 w-4" /></Link>
        </Button>
        <Button variant="outline" size="sm" asChild aria-label="Edit">
          <Link to={`/blogs/${post.slug}/edit`}><Edit2 className="h-4 w-4" /></Link>
        </Button>
        <Button
          variant={isPublished ? 'outline' : 'default'}
          size="sm"
          onClick={() => { void handleToggleStatus(post) }}
          disabled={isTogglingStatus}
        >
          {isPublished ? <><EyeOff className="mr-1 h-4 w-4" />Unpublish</> : <><CheckCircle className="mr-1 h-4 w-4" />Publish</>}
        </Button>
        <ConfirmAlertDialog
          title="Delete Blog Post"
          description={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => handleDeletePost(post)}
        >
          {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>}
        </ConfirmAlertDialog>
      </div>
    )
  }, [handleDeletePost, handleToggleStatus, isDeleting, isTogglingStatus])

  const columns = useMemo<ColumnDef<BlogPost>[]>(() => [
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="text-muted-foreground">#{row.original.id}</span> },
    {
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
      cell: ({ row }) => <div className="space-y-1">
        <Link to={`/blogs/${row.original.slug}`} className="font-medium text-foreground transition-colors hover:text-cohere-action-blue">{row.original.title}</Link>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.original.created_at)}</div>
      </div>,
    },
    {
      accessorKey: 'categories', header: 'Categories',
      cell: ({ row }) => <div className="flex flex-wrap gap-1">{(row.original.categories ?? []).map((category) =>
        <Badge key={category.slug} variant="secondary">{category.name}</Badge>)}</div>,
    },
    {
      accessorKey: 'tags', header: 'Tags',
      cell: ({ row }) => <div className="flex flex-wrap gap-1">{(row.original.tags ?? []).map((tag) =>
        <Badge key={tag.slug} variant="outline">{tag.name}</Badge>)}</div>,
    },
    {
      accessorFn: resolveBlogStatus, id: 'status',
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => {
        const post = row.original
        const status = resolveBlogStatus(post)
        return <div className="flex flex-col gap-1">
          <Badge variant="outline" className={blogStatusBadgeClass(status)}>{blogStatusLabel(status)}</Badge>
          {status === 'scheduled' && post.scheduled_at && <span className="text-xs text-muted-foreground">{formatDateTime(post.scheduled_at)}</span>}
        </div>
      },
    },
    { id: 'actions', header: 'Actions', cell: ({ row }) => renderActions(row.original) },
  ], [renderActions])

  const renderCard = (post: BlogPost) => {
    const status = resolveBlogStatus(post)
    const categories = post.categories ?? []
    return <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="break-words font-medium">{post.title}</div>
          <div className="text-xs text-muted-foreground">{formatDateTime(post.created_at)}</div>
        </div>
        <Badge variant="outline" className={blogStatusBadgeClass(status)}>{blogStatusLabel(status)}</Badge>
      </div>
      {categories.length > 0 && <div className="flex flex-wrap gap-1">
        {categories.slice(0, 3).map((category) => <Badge key={category.slug} variant="secondary">{category.name}</Badge>)}
        {categories.length > 3 && <span className="self-center text-xs text-muted-foreground">+{categories.length - 3}</span>}
      </div>}
      {renderActions(post)}
    </Card>
  }

  return <ResponsiveDataTable
    columns={columns}
    data={posts}
    enableColumnVisibility
    enableSorting
    mobileCardRender={renderCard}
    viewStorageKey={viewStorageKey}
  />
}
