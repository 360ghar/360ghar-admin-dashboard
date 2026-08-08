import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import MultiSelect from '@/components/ui/multi-select'
import ImageUpload from '@/components/common/media/ImageUpload'
import { useGetBlogPostQuery, useUpdateBlogPostMutation, useGetBlogCategoriesQuery, useGetBlogTagsQuery } from '@/features/blog/api/blogsApi'
import { useToast } from '@/hooks/use-toast'
import { blogPostSchema, type BlogPostForm } from '@/lib/blogValidation'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { serverTimestampToLocalInput, localInputToServerTimestamp } from '@/lib/dateTime'
import type { BlogCategory, BlogTag } from '@/types/blog'
import type { BlogPostStatus } from '@/types/blog'

const BlogPostContentForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>> }> = ({ form }) => (
  <>
    <div className="md:col-span-2"><FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Finding Your Dream Home in Mumbai" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content (HTML or Markdown)</FormLabel><FormControl><div className="overflow-hidden rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md"><RichTextEditor value={field.value} onChange={field.onChange} /></div></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea rows={3} placeholder="Short summary (optional)" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
  </>
)

const BlogPostMetaForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>>; images: string[]; setImages: (urls: string[]) => void; categoryOptions: { value: string; label: string }[]; tagOptions: { value: string; label: string }[] }> = ({ form, images, setImages, categoryOptions, tagOptions }) => (
  <>
    <div className="md:col-span-2">
      <FormLabel>Cover Image</FormLabel>
      <ImageUpload value={images} onChange={setImages} multiple={false} primary={images[0] || null} onPrimaryChange={(u) => { setImages(u ? [u, ...images.filter(i => i !== u)] : images.filter(i => i !== u)) }} />
      <div className="mt-2"><FormField control={form.control} name="cover_image_url" render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Cover Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    </div>
    <div><FormField control={form.control} name="categories" render={({ field }) => (<FormItem><FormLabel>Categories</FormLabel><FormControl><MultiSelect options={categoryOptions} selected={field.value || []} onChange={field.onChange} placeholder="Select categories..." emptyMessage="No categories found. Create some first!" /></FormControl><FormMessage /></FormItem>)} /></div>
    <div><FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><MultiSelect options={tagOptions} selected={field.value || []} onChange={field.onChange} placeholder="Select tags..." emptyMessage="No tags found. Create some first!" /></FormControl><FormMessage /></FormItem>)} /></div>
    <div>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                // Clear the scheduled timestamp whenever we leave the "scheduled" status.
                if (value !== 'scheduled') form.setValue('scheduled_at', '')
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <FormField
      control={form.control}
      name="scheduled_at"
      render={({ field }) => (
        <FormItem className={field.value !== undefined && form.watch('status') === 'scheduled' ? '' : 'hidden'}>
          <FormLabel>Scheduled Publish Date &amp; Time</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              placeholder="Pick a future date and time"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">Required when status is Scheduled. The post will go live at this time.</p>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)

interface BlogEditProps { identifier: string; onSuccess?: (slug: string) => void }

const BlogEdit: React.FC<BlogEditProps> = ({ identifier, onSuccess }) => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { data: post, isFetching: isFetchingPost, error: postError, refetch } = useGetBlogPostQuery(identifier)
  const [updateBlogPost, { isLoading: isUpdating }] = useUpdateBlogPostMutation()
  const { data: categoriesData } = useGetBlogCategoriesQuery({ limit: 100 })
  const { data: tagsData } = useGetBlogTagsQuery({ limit: 100 })

  const form = useForm<BlogPostForm>({ resolver: zodResolver(blogPostSchema), defaultValues: { title: '', content: '', excerpt: '', cover_image_url: '', status: 'draft', scheduled_at: '', categories: [], tags: [] } })
  const { setValue } = form
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (post) {
      setValue('title', post.title); setValue('content', post.content); setValue('excerpt', post.excerpt || '')
      setValue('cover_image_url', post.cover_image_url || ''); setValue('categories', post.categories?.map((cat) => cat.slug) || [])
      setValue('tags', post.tags?.map((tag) => tag.slug) || [])
      // Resolve the effective status: prefer the backend-provided `status`,
      // fall back to the legacy `active` boolean for older posts.
      const effectiveStatus: BlogPostStatus = post.status ? (post.status as BlogPostStatus) : (post.active ? 'published' : 'draft')
      setValue('status', effectiveStatus)
      setValue('scheduled_at', post.scheduled_at ? serverTimestampToLocalInput(post.scheduled_at) : '')
      if (post.cover_image_url) setImages([post.cover_image_url])
    }
  }, [post, setValue])

  useEffect(() => { if (images.length) setValue('cover_image_url', images[0] || '') }, [images, setValue])

  const onSubmit = async (values: BlogPostForm) => {
    if (!post) return
    try {
      const isScheduled = values.status === 'scheduled'
      const payload = {
        title: values.title,
        content: values.content,
        excerpt: values.excerpt || undefined,
        cover_image_url: values.cover_image_url || undefined,
        categories: values.categories?.length ? values.categories : undefined,
        tags: values.tags?.length ? values.tags : undefined,
        status: values.status,
        // Only forward a timestamp when scheduled; otherwise clear it so the
        // backend doesn't keep a stale value. The backend derives `active`
        // from `status`, so we no longer send `active` directly.
        scheduled_at: isScheduled ? localInputToServerTimestamp(values.scheduled_at ?? '') : null,
      }
      const res = await updateBlogPost({ identifier: post.id, data: payload }).unwrap()
      toast({ title: 'Updated', description: 'Blog post updated successfully' }); onSuccess?.(res.slug)
    } catch (e: unknown) { applyServerValidation(e, form.setError); toast({ title: 'Update failed', description: getErrorMessage(e, 'Please check inputs'), variant: 'destructive' }) }
  }

  const categoryOptions = categoriesData?.items?.map((cat: BlogCategory) => ({ value: cat.slug, label: cat.name })) || []
  const tagOptions = tagsData?.items?.map((tag: BlogTag) => ({ value: tag.slug, label: tag.name })) || []

  if (isFetchingPost) return <div className="space-y-4"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button></div><Card><CardContent className="p-6"><LoadingState type="card" rows={6} /></CardContent></Card></div>
  if (postError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/blogs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts
          </Button>
        </div>
        <ErrorState
          title="Failed to load post"
          error={postError}
          onRetry={() => { void refetch() }}
        />
      </div>
    )
  }
  if (!post) return <div className="space-y-4"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button></div><Card><CardContent className="p-6"><EmptyState title="Post not found" /></CardContent></Card></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button><h1 className="text-xl font-semibold">Edit Blog Post</h1></div></div>
      <Card><CardHeader><CardTitle>Edit Post Details</CardTitle></CardHeader>
        <CardContent><Form {...form}><form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><FormRootError form={form} /></div>
          <BlogPostContentForm form={form} />
          <BlogPostMetaForm form={form} images={images} setImages={setImages} categoryOptions={categoryOptions} tagOptions={tagOptions} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/blogs')}>Cancel</Button>
            <Button type="submit" disabled={isUpdating}><Save className="h-4 w-4 mr-2" />{isUpdating ? 'Updating…' : 'Update Post'}</Button>
          </div>
        </form></Form></CardContent>
      </Card>
    </div>
  )
}

export default BlogEdit
