import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { BlogPostContentForm, BlogPostMetaForm } from '@/features/blog/components/BlogPostFormFields'
import { useGetBlogPostQuery, useUpdateBlogPostMutation, useListAllBlogCategoriesQuery, useListAllBlogTagsQuery } from '@/features/blog/api/blogsApi'
import { resolveBlogStatus } from '@/features/blog/constants'
import { useToast } from '@/hooks/use-toast'
import { blogPostSchema, type BlogPostForm } from '@/lib/blogValidation'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { serverTimestampToLocalInput, localInputToServerTimestamp } from '@/lib/dateTime'
import type { BlogPostUpdate } from '@/types/blog'

interface BlogEditProps { identifier: string; onSuccess?: (slug: string) => void }

const BlogEdit: React.FC<BlogEditProps> = ({ identifier, onSuccess }) => {
  const { toast } = useToast()
  const mounted = useRef(true)
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const [imageUploading, setImageUploading] = useState(false)
  const navigate = useNavigate()
  const { currentData: post, isFetching: isFetchingPost, error: postError, refetch } = useGetBlogPostQuery(identifier)
  const [updateBlogPost, { isLoading: isUpdating }] = useUpdateBlogPostMutation()
  // The pickers need every category and tag, so these read all pages.
  const { data: categoriesData, error: categoriesError, refetch: refetchCategories } = useListAllBlogCategoriesQuery()
  const { data: tagsData, error: tagsError, refetch: refetchTags } = useListAllBlogTagsQuery()

  const form = useForm<z.input<typeof blogPostSchema>, unknown, BlogPostForm>({ resolver: zodResolver(blogPostSchema), defaultValues: { title: '', content: '', excerpt: '', cover_image_url: '', status: 'draft', scheduled_at: '', categories: [], tags: [], meta_title: '', meta_description: '', focus_keyword: '', canonical_url: '', og_image_url: '' } })
  const allowSavedNavigation = useUnsavedChanges(form.formState.isDirty)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const [images, setImages] = useState<string[]>([])
  const hydratedPostId = useRef<number | null>(null)

  useEffect(() => {
    if (post && hydratedPostId.current !== post.id) {
      // `status` is the source of truth. An unknown value keeps the form on "draft" until the editor picks one.
      const effectiveStatus = resolveBlogStatus(post) ?? 'draft'
      form.reset({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt ?? '',
        cover_image_url: post.cover_image_url ?? '',
        categories: (post.categories ?? []).flatMap((cat) => cat.slug ? [cat.slug] : []),
        tags: (post.tags ?? []).flatMap((tag) => tag.slug ? [tag.slug] : []),
        meta_title: post.meta_title ?? '',
        meta_description: post.meta_description ?? '',
        focus_keyword: post.focus_keyword ?? '',
        canonical_url: post.canonical_url ?? '',
        og_image_url: post.og_image_url ?? '',
        status: effectiveStatus,
        scheduled_at: post.scheduled_at ? serverTimestampToLocalInput(post.scheduled_at) : '',
      })
      setImages(post.cover_image_url ? [post.cover_image_url] : [])
      hydratedPostId.current = post.id
    }
  }, [post, form])

  const onSubmit = async (values: BlogPostForm) => {
    if (!post || submitting.current || imageUploading) return
    submitting.current = true
    if (formRef.current) formRef.current.inert = true
    try {
      const isScheduled = values.status === 'scheduled'
      // PUT is PATCH-style. A cleared field must go out as null (text) or [] (lists): an omitted key keeps the stored value.
      const payload: BlogPostUpdate = {
        title: values.title,
        content: values.content,
        excerpt: values.excerpt?.trim() ? values.excerpt : null,
        cover_image_url: values.cover_image_url?.trim() ? values.cover_image_url : null,
        categories: values.categories ?? [],
        tags: values.tags ?? [],
        status: values.status,
        // Only a scheduled post keeps a timestamp; any other status clears it. The backend derives
        // `active` from `status`, so `active` is not sent.
        scheduled_at: isScheduled ? localInputToServerTimestamp(values.scheduled_at ?? '') : null,
        meta_title: values.meta_title?.trim() || null,
        meta_description: values.meta_description?.trim() || null,
        focus_keyword: values.focus_keyword?.trim() || null,
        canonical_url: values.canonical_url?.trim() || null,
        og_image_url: values.og_image_url?.trim() || null,
      }
      const res = await updateBlogPost({ identifier: post.id, data: payload }).unwrap()
      if (!mounted.current) return
      form.reset(values)
      toast({ title: 'Updated', description: 'Blog post updated successfully' }); allowSavedNavigation(); onSuccess?.(res.slug)
    } catch (e: unknown) { if (!mounted.current) return; applyServerValidation(e, form.setError); toast({ title: 'Update failed', description: getErrorMessage(e, 'Please check inputs'), variant: 'destructive' }) }
    finally { submitting.current = false; if (mounted.current && formRef.current) formRef.current.inert = false }
  }

  const categoryOptions = (categoriesData ?? []).flatMap((cat) => cat.slug ? [{ value: cat.slug, label: cat.name }] : [])
  const tagOptions = (tagsData ?? []).flatMap((tag) => tag.slug ? [{ value: tag.slug, label: tag.name }] : [])

  if (isFetchingPost && !post) return <div className="space-y-4"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => void navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button></div><Card><CardContent className="p-6"><LoadingState type="card" rows={6} /></CardContent></Card></div>
  if (postError && !post) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => void navigate('/blogs')}>
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
  if (!post) return <div className="space-y-4"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => void navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button></div><Card><CardContent className="p-6"><EmptyState title="Post not found" /></CardContent></Card></div>

  return (
    <div className="space-y-4">
      {isUpdating && <p role="status" className="text-sm text-muted-foreground">Updating blog post…</p>}
      {isFetchingPost && <p role="status" className="text-sm text-muted-foreground">Checking for updates…</p>}
      {postError && <p role="alert" className="text-sm text-destructive">Could not refresh this post. Your edits are still here. <Button variant="link" size="sm" onClick={() => void refetch()}>Retry</Button></p>}
      {(categoriesError || tagsError) && <p role="alert" className="text-sm text-destructive">Could not load {categoriesError && tagsError ? 'categories and tags' : categoriesError ? 'categories' : 'tags'}. Saved selections remain. <Button type="button" variant="link" size="sm" onClick={() => { if (categoriesError) void refetchCategories(); if (tagsError) void refetchTags() }}>Retry options</Button></p>}
      <div className="flex items-center justify-between"><div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={() => void navigate('/blogs')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog Posts</Button><h1 className="text-xl font-semibold">Edit Blog Post</h1></div></div>
      <Card><CardHeader><CardTitle>Edit Post Details</CardTitle></CardHeader>
        <CardContent><Form {...form}><form ref={formRef} onSubmit={(e) => {
          if (submitting.current || imageUploading) { e.preventDefault(); return }
          void form.handleSubmit(onSubmit)(e)
        }} className="grid gap-4 md:grid-cols-2" aria-busy={isUpdating}>
          <fieldset disabled={isUpdating} className="contents">
          <div className="md:col-span-2"><FormRootError form={form} /></div>
          <BlogPostContentForm form={form} disabled={isUpdating} />
          <BlogPostMetaForm form={form} images={images} setImages={setImages} categoryOptions={categoryOptions} tagOptions={tagOptions} onImageUploadingChange={setImageUploading} disabled={isUpdating} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void navigate('/blogs')}>Cancel</Button>
            <Button type="submit" disabled={isUpdating || imageUploading}><Save className="h-4 w-4 mr-2" />{isUpdating ? 'Updating…' : 'Update Post'}</Button>
          </div>
          </fieldset>
        </form></Form></CardContent>
      </Card>
    </div>
  )
}

export default BlogEdit
