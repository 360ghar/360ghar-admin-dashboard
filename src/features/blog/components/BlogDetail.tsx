import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, CheckCircle, Clock, Edit2, EyeOff, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import SplitText from '@/components/reactbits/SplitText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useToast } from '@/hooks/use-toast'
import { useDeleteBlogPostMutation, useGetBlogPostQuery, useUpdateBlogPostMutation } from '@/features/blog/api/blogsApi'
import { getErrorMessage, isApiError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { SanitizedHtml } from '@/components/ui/sanitized-html'
import { resolveBlogStatus, blogStatusBadgeClass, blogStatusLabel } from '@/features/blog/constants'
import type { BlogPostStatus } from '@/types/blog'

const getErrorStatus = (error: unknown) => {
  if (!isApiError(error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

const isProbablyHtml = (content: string) => {
  const value = content.trim()
  if (!value) return false
  // Treat the content as HTML when it starts with a tag.
  // This keeps Markdown (which typically starts with text or #, *, etc.)
  // rendered via the Markdown renderer, while full HTML snippets like
  // <p>...</p><h2>...</h2> are injected as HTML.
  return value.startsWith('<')
}

const estimateReadingTimeMinutes = (content: string) => {
  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#-]/g, ' ')
  const words = plainText.trim().split(/\s+/).filter(Boolean).length
  if (!words) return null
  return Math.max(1, Math.round(words / 200))
}

const BlogDetail = ({ identifier }: { identifier: string }) => {
  const navigate = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()
  const { toast } = useToast()
  const { data: post, isFetching, error, refetch } = useGetBlogPostQuery(identifier)
  const [updateBlogPost, { isLoading: isTogglingStatus }] = useUpdateBlogPostMutation()
  const [deleteBlogPost, { isLoading: isDeleting }] = useDeleteBlogPostMutation()

  const readingTime = useMemo(
    () => (post?.content ? estimateReadingTimeMinutes(post.content) : null),
    [post?.content]
  )

  const handleToggleStatus = async () => {
    if (!post) return
    const currentStatus = resolveBlogStatus(post)
    const nextStatus: BlogPostStatus = currentStatus === 'published' ? 'draft' : 'published'
    try {
      await updateBlogPost({ identifier: post.id, data: { status: nextStatus, scheduled_at: null } }).unwrap()
      toast({
        title: nextStatus === 'published' ? 'Post published' : 'Post unpublished',
        description: nextStatus === 'published'
          ? 'The blog post is now visible to users.'
          : 'The blog post has been moved back to drafts.',
      })
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorMessage(e, 'Failed to update publish status'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!post) return
    try {
      await deleteBlogPost(post.id).unwrap()
      toast({ title: 'Deleted', description: 'Blog post deleted successfully' })
      navigate('/blogs')
    } catch (e: unknown) { toast({ title: 'Delete failed', description: getErrorMessage(e, 'Failed to delete blog post'), variant: 'destructive' }) }
  }

  if (isFetching) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/blogs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog Posts
          </Button>
        </div>
        <Card>
          <LoadingState type="card" rows={4} />
        </Card>
      </div>
    )
  }

  if (error) {
    const status = getErrorStatus(error)
    const isNotFound = status === 404

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/blogs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog Posts
          </Button>
        </div>
        <ErrorState
          title={isNotFound ? 'Post not found' : 'Failed to load post'}
          description={
            isNotFound
              ? 'The blog post you are looking for does not exist or may have been removed.'
              : undefined
          }
          error={isNotFound ? undefined : error}
          onRetry={isNotFound ? undefined : () => { void refetch() }}
        />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/blogs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog Posts
          </Button>
        </div>
        <ErrorState
          title="Post not found"
          description="We couldn't find this blog post. It may have been deleted or the link is incorrect."
        />
      </div>
    )
  }

  const contentIsHtml = isProbablyHtml(post.content)

  return (
    <div className="space-y-4">
      <PageHeader
        title={post.title}
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span>Post ID: #{post.id}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>Slug: {post.slug}</span>
          </span>
        }
        breadcrumbs={[
          { label: 'Blog', to: '/blogs' },
          { label: post.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={blogStatusBadgeClass(resolveBlogStatus(post))}>
              {blogStatusLabel(resolveBlogStatus(post))}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/blogs/${post.slug}/edit`)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={resolveBlogStatus(post) === 'published' ? 'outline' : 'default'}
              size="sm"
              onClick={() => { void handleToggleStatus() }}
              disabled={isTogglingStatus}
            >
              {resolveBlogStatus(post) === 'published' ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
            <ConfirmAlertDialog
              title="Delete Blog Post"
              description={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={handleDelete}
            >
              {(openDialog) => (
                <Button variant="outline" size="sm" onClick={openDialog} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        }
      />

      {resolveBlogStatus(post) !== 'published' && (
        <Alert>
          <AlertTitle>
            {resolveBlogStatus(post) === 'scheduled' ? 'This post is scheduled' : 'This post is a draft'}
          </AlertTitle>
          <AlertDescription>
            {resolveBlogStatus(post) === 'scheduled' && post.scheduled_at
              ? `This post will be published on ${formatDateTime(post.scheduled_at)}.`
              : 'Draft posts are only visible to admins. Publish the post when you\'re ready for it to appear on the site.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          {prefersReducedMotion ? (
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{post.title}</h1>
          ) : (
            <SplitText
              text={post.title}
              tag="h1"
              splitType="words, chars"
              threshold={0}
              rootMargin="0px"
              delay={14}
              duration={0.8}
              textAlign="left"
              className="text-3xl font-semibold tracking-tight md:text-4xl"
            />
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Created {formatDateTime(post.created_at)}</span>
            {post.updated_at && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span>Updated {formatDateTime(post.updated_at)}</span>
              </>
            )}
            {readingTime && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{readingTime} min read
                </span>
              </>
            )}
          </div>
          {post.excerpt && (
            <p className="mt-2 text-sm text-muted-foreground">
              {post.excerpt}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full max-h-80 rounded object-cover"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {(post.categories || []).map((c) => (
              <Badge key={c.slug} variant="secondary">{c.name}</Badge>
            ))}
            {(post.tags || []).map((t) => (
              <Badge key={t.slug} variant="outline">#{t.name}</Badge>
            ))}
          </div>
          {contentIsHtml ? (
            <SanitizedHtml html={post.content} className="prose max-w-none" />
          ) : (
            <ReactMarkdown className="prose max-w-none">
              {post.content}
            </ReactMarkdown>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default BlogDetail
