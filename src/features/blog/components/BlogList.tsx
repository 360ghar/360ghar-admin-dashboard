import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { useDebounce } from '@/hooks/useDebounce'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useGetBlogPostsQuery } from '@/features/blog/api/blogsApi'
import { BLOG_POST_STATUSES, type BlogPostFilters, type BlogPostStatus } from '@/types/blog'
import { resolveBlogStatus } from '@/features/blog/constants'
import { downloadCsv, csvFilename } from '@/lib/csv'
import { useUserRole } from '@/hooks/useUserRole'
import { scopedStorageKey } from '@/lib/storage'
import { BlogListResults } from './BlogListResults'

const DEFAULT_FILTERS = {
  q: '',
  categoriesText: '',
  tagsText: '',
  statusFilter: 'all' as 'all' | BlogPostStatus,
}

const BlogList = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useUserRole()
  const { filters, setFilters, clearFilters } = useFilterPersistence({
    key: 'blogs',
    accountId: user?.supabase_user_id,
    defaultValue: DEFAULT_FILTERS,
  })
  const { q, categoriesText, tagsText } = filters
  const statusFilter = filters.statusFilter === 'all' || BLOG_POST_STATUSES.includes(filters.statusFilter)
    ? filters.statusFilter
    : 'all'
  const accountId = user?.supabase_user_id ?? null
  const scopedSearch = useMemo(() => ({ accountId, q }), [accountId, q])
  const debouncedSearch = useDebounce(scopedSearch, 300)
  // A pending search from the previous account must not reach the new account's query.
  const dq = debouncedSearch.accountId === accountId ? debouncedSearch.q : ''
  useEffect(() => {
    if (statusFilter !== filters.statusFilter) setFilters({ statusFilter: 'all' })
  }, [filters.statusFilter, setFilters, statusFilter])
  const pageSize = 20
  const pager = useCursorPagination(JSON.stringify([accountId, dq, categoriesText, tagsText, statusFilter]))

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

  const { currentData: data, isFetching, isLoading, error, refetch } = useGetBlogPostsQuery(params)

  const activeFilterCount =
    (q ? 1 : 0) +
    (categoriesText ? 1 : 0) +
    (tagsText ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0)

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
                  onChange={(e) => setFilters({ q: e.target.value })}
                  className="pl-10"
                />
              </div>
            </FilterSection>
            <FilterSection label="Categories">
              <Input
                placeholder="Filter by categories (comma separated)"
                value={categoriesText}
                onChange={(e) => setFilters({ categoriesText: e.target.value })}
              />
            </FilterSection>
            <FilterSection label="Tags">
              <Input
                placeholder="Filter by tags (comma separated)"
                value={tagsText}
                onChange={(e) => setFilters({ tagsText: e.target.value })}
              />
            </FilterSection>
            <FilterSection label="Status">
              <Select value={statusFilter} onValueChange={(v) => setFilters({ statusFilter: v as 'all' | BlogPostStatus })}>
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
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || !data?.items?.length} className="gap-2 ml-auto">
            <Download className="h-4 w-4" />Export current page
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
                onChange={(e) => setFilters({ q: e.target.value })}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by categories (comma separated)"
              value={categoriesText}
              onChange={(e) => setFilters({ categoriesText: e.target.value })}
            />
            <Input
              placeholder="Filter by tags (comma separated)"
              value={tagsText}
              onChange={(e) => setFilters({ tagsText: e.target.value })}
            />
            <Select value={statusFilter} onValueChange={(v) => setFilters({ statusFilter: v as 'all' | BlogPostStatus })}>
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
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching || !data?.items?.length} className="gap-2">
              <Download className="h-4 w-4" />Export current page
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        {error && !data?.items?.length ? (
          <ErrorState
            title="Failed to load posts"
            error={error}
            onRetry={() => { void refetch() }}
          />
        ) : isLoading || (isFetching && !data) ? (
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
            {isFetching && <p role="status" className="text-sm text-muted-foreground">Updating posts…</p>}
            {error && <p role="alert" className="text-sm text-destructive">Refresh failed. Showing the last result for these filters. <Button variant="link" size="sm" onClick={() => void refetch()}>Retry</Button></p>}
            <BlogListResults posts={data.items} viewStorageKey={user?.supabase_user_id ? scopedStorageKey('blogs-table', user.supabase_user_id) : 'blogs-table-anonymous'} />
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
