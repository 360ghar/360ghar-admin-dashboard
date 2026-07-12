import {useMemo, useState, useCallback} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Search, Edit2, Trash2, Eye, CheckCircle, EyeOff, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SortableHeader } from '@/components/ui/data-table'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useDebounce } from '@/hooks/useDebounce'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useGetBlogPostsQuery, useDeleteBlogPostMutation, useUpdateBlogPostMutation } from '@/features/blog/api/blogsApi'
import { toast } from '@/hooks/use-toast'
import type { BlogPost, BlogPostFilters, BlogPostStatus } from '@/types/blog'
import { blogStatusBadgeClass, blogStatusLabel, resolveBlogStatus } from '@/features/blog/constants'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { downloadCsv, csvFilename } from '@/lib/csv'

const BlogList = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [q, setQ] = useState('')
  const dq = useDebounce(q, 300)
  const [categoriesText, setCategoriesText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all')
  const pageSize = 20
  const pager = useCursorPagination(`${dq}|${categoriesText}|${tagsText}|${statusFilter}`)

  const params = useMemo(() => {
    const p: BlogPostFilters = { cursor: pager.cursor, limit: pageSize }
    if (dq) p.q = dq
    const cats = categoriesText.split(',').map((s) => s.trim()).filter(Boolean)
    const tags = tagsText.split(',').map((s) => s.trim()).filter(Boolean)
    if (cats.length) p.categories = cats
    if (tags.length) p.tags = tags
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [dq, categoriesText, tagsText, statusFilter, pager.cursor, pageSize])

  const { data, isFetching, isLoading, error, refetch } = useGetBlogPostsQuery(params)

  const activeFilterCount =
    (q ? 1 : 0) +
    (categoriesText ? 1 : 0) +
    (tagsText ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setQ('')
    setCategoriesText('')
    setTagsText('')
    setStatusFilter('all')
  }

  const handleExport = () => {
    const rows = (data?.items ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: resolveBlogStatus(p),
      scheduled_at: p.scheduled_at ?? '',
      created_at: p.created_at,
      categories: (p.categories ?? []).map((c) => c.slug).join('|'),
      tags: (p.tags ?? []).map((t) => t.slug).join('|')}))
    downloadCsv(csvFilename('blog-posts'), rows)
  }
  const [deleteBlogPost, { isLoading: isDeleting }] = useDeleteBlogPostMutation()
  const [updateBlogPost, { isLoading: isTogglingStatus }] = useUpdateBlogPostMutation()

  const handleDeletePost = useCallback(async (post: BlogPost) => {
    try {
      await deleteBlogPost(post.id).unwrap()
      toast({ title: 'Success', description: 'Blog post deleted successfully' })
    } catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to delete blog post'), variant: 'destructive' }) }
  }, [deleteBlogPost])

  // Toggle a post between draft and published via the lifecycle `status` field.
  // The backend derives `active` from `status`, so we no longer send `active`.
  const handleToggleStatus = useCallback(async (post: BlogPost) => {
    const currentStatus = resolveBlogStatus(post)
    const nextStatus: BlogPostStatus = currentStatus === 'published' ? 'draft' : 'published'
    const isPublishing = nextStatus === 'published'
    try {
      await updateBlogPost({
        identifier: post.id,
        data: { status: nextStatus, scheduled_at: null }}).unwrap()
      toast({
        title: isPublishing ? 'Post published' : 'Post unpublished',
        description: isPublishing
          ? 'The blog post is now visible to users.'
          : 'The blog post has been moved back to drafts.'})
    } catch (error: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorMessage(error, 'Failed to update publish status'),
        variant: 'destructive'})
    }
  }, [updateBlogPost])

  const renderActions = useCallback((post: BlogPost) => {
    const status = resolveBlogStatus(post)
    const isPublished = status === 'published'
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild aria-label="View">
          <Link to={`/blogs/${post.slug}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild aria-label="Edit">
          <Link to={`/blogs/${post.slug}/edit`}>
            <Edit2 className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant={isPublished ? 'outline' : 'default'}
          size="sm"
          onClick={() => { void handleToggleStatus(post) }}
          disabled={isTogglingStatus}
        >
          {isPublished ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Unpublish
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Publish
            </>
          )}
        </Button>
        <ConfirmAlertDialog
          title="Delete Blog Post"
          description={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => handleDeletePost(post)}
        >
          {(openDialog) => (
            <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </ConfirmAlertDialog>
      </div>
    )
  }, [handleDeletePost, handleToggleStatus, isDeleting, isTogglingStatus])

  const columns = useMemo<ColumnDef<BlogPost>[]>(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="text-muted-foreground">#{row.original.id}</span>},
    {
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link to={`/blogs/${row.original.slug}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
          <div className="text-xs text-muted-foreground">{formatDateTime(row.original.created_at)}</div>
        </div>
      )},
    {
      accessorKey: 'categories',
      header: 'Categories',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.categories || []).map((c) => (
            <Badge key={c.slug} variant="secondary">{c.name}</Badge>
          ))}
        </div>
      )},
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.tags || []).map((t) => (
            <Badge key={t.slug} variant="outline">{t.name}</Badge>
          ))}
        </div>
      )},
    {
      accessorFn: (row) => resolveBlogStatus(row),
      id: 'status',
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => {
        const post = row.original
        const status = resolveBlogStatus(post)
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className={blogStatusBadgeClass(status)}>
              {blogStatusLabel(status)}
            </Badge>
            {status === 'scheduled' && post.scheduled_at && (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(post.scheduled_at)}
              </span>
            )}
          </div>
        )
      }},
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderActions(row.original)},
  ], [renderActions])

  const renderCard = (post: BlogPost) => {
    const status = resolveBlogStatus(post)
    const categories = post.categories ?? []
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{post.title}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(post.created_at)}</div>
          </div>
          <Badge variant="outline" className={blogStatusBadgeClass(status)}>
            {blogStatusLabel(status)}
          </Badge>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 3).map((c) => (
              <Badge key={c.slug} variant="secondary">{c.name}</Badge>
            ))}
            {categories.length > 3 && (
              <span className="text-xs text-muted-foreground self-center">+{categories.length - 3}</span>
            )}
          </div>
        )}
        {renderActions(post)}
      </Card>
    )
  }

  const hasFilters = activeFilterCount > 0

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6">
        {/* Mobile filters */}
        <div className="mb-0 flex items-center gap-2 md:hidden">
          <MobileFilters activeCount={activeFilterCount} onClear={clearFilters} title="Blog filters">
            <FilterSection label="Search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10"
                />
              </div>
            </FilterSection>
            <FilterSection label="Categories">
              <Input
                placeholder="Filter by categories (comma separated)"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
              />
            </FilterSection>
            <FilterSection label="Tags">
              <Input
                placeholder="Filter by tags (comma separated)"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
              />
            </FilterSection>
            <FilterSection label="Status">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | BlogPostStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>
          </MobileFilters>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || isLoading} className="gap-2 ml-auto">
            <Download className="h-4 w-4" />Export
          </Button>
        </div>

        {/* Desktop filters */}
        <div className="hidden md:block">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by categories (comma separated)"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
            />
            <Input
              placeholder="Filter by tags (comma separated)"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | BlogPostStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || isLoading} className="gap-2">
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        {error ? (
          <ErrorState
            title="Failed to load posts"
            error={error}
            onRetry={() => { void refetch() }}
          />
        ) : isLoading ? (
          <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
        ) : !data?.items?.length ? (
          <EmptyState
            title={hasFilters ? 'No posts match your filters' : 'No posts found'}
            description={hasFilters ? 'Try adjusting search or filters.' : 'Create your first blog post to get started.'}
            action={
              hasFilters
                ? { label: 'Clear filters', onClick: clearFilters, variant: 'outline' }
                : { label: 'Create Post', onClick: () => navigate('/blogs/new') }
            }
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveDataTable
              columns={columns}
              data={data.items}
              enableSorting
              mobileCardRender={renderCard}
              viewStorageKey="blogs-table"
            />
            <CursorPager
              canPrev={pager.canPrev}
              hasMore={data.has_more}
              nextCursor={data.next_cursor}
              loading={isFetching}
              onPrev={pager.prev}
              onNext={() => pager.next(data.next_cursor)}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default BlogList
