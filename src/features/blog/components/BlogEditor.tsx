import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { BlogPostContentForm, BlogPostMetaForm } from '@/features/blog/components/BlogPostFormFields'
import { useCreateBlogPostMutation, useListAllBlogCategoriesQuery, useListAllBlogTagsQuery } from '@/features/blog/api/blogsApi'
import { useToast } from '@/hooks/use-toast'
import { blogPostSchema, type BlogPostForm } from '@/lib/blogValidation'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import type { BlogPostCreate } from '@/types/blog'

const BlogEditor = ({ onSuccess }: { onSuccess?: (slug: string) => void }) => {
  const { toast } = useToast()
  const mounted = useRef(true)
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [createBlogPost, createState] = useCreateBlogPostMutation()

  // Fetch categories and tags
  const { data: categoriesData, error: categoriesError, refetch: refetchCategories } = useListAllBlogCategoriesQuery()
  const { data: tagsData, error: tagsError, refetch: refetchTags } = useListAllBlogTagsQuery()

  const form = useForm<z.input<typeof blogPostSchema>, unknown, BlogPostForm>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      cover_image_url: '',
      categories: [],
      tags: [],
      status: 'draft',
      scheduled_at: '',
      meta_title: '',
      meta_description: '',
      focus_keyword: '',
      canonical_url: '',
      og_image_url: '',
    },
  })
  const allowSavedNavigation = useUnsavedChanges(form.formState.isDirty)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const [images, setImages] = useState<string[]>([])

  const onSubmit = async (values: BlogPostForm) => {
    if (submitting.current || imageUploading) return
    submitting.current = true
    if (formRef.current) formRef.current.inert = true
    form.clearErrors()
    try {
      const payload: BlogPostCreate = {
        title: values.title,
        content: values.content,
        excerpt: values.excerpt || undefined,
        cover_image_url: values.cover_image_url || undefined,
        categories: values.categories?.length ? values.categories : undefined,
        tags: values.tags?.length ? values.tags : undefined,
        status: values.status,
        // Convert datetime-local to ISO for the API (matches BlogEdit).
        scheduled_at:
          values.status === 'scheduled'
            ? localInputToServerTimestamp(values.scheduled_at ?? '')
            : undefined,
        meta_title: values.meta_title?.trim() || undefined,
        meta_description: values.meta_description?.trim() || undefined,
        focus_keyword: values.focus_keyword?.trim() || undefined,
        canonical_url: values.canonical_url?.trim() || undefined,
        og_image_url: values.og_image_url?.trim() || undefined,
      }

      const res = await createBlogPost(payload).unwrap()
      if (!mounted.current) return
      form.reset(values)
      toast({ title: 'Created', description: 'Blog post created successfully' })
      allowSavedNavigation()
      onSuccess?.(res.slug)
    } catch (e: unknown) {
      if (!mounted.current) return
      applyServerValidation(e, form.setError)
      toast({ title: 'Save failed', description: getErrorMessage(e, 'Please check inputs'), variant: 'destructive' })
    } finally {
      submitting.current = false
      if (mounted.current && formRef.current) formRef.current.inert = false
    }
  }

  // Prepare category and tag options for multi-select
  const categoryOptions = (categoriesData ?? []).flatMap((cat) => cat.slug ? [{ value: cat.slug, label: cat.name }] : [])
  const tagOptions = (tagsData ?? []).flatMap((tag) => tag.slug ? [{ value: tag.slug, label: tag.name }] : [])

  return (
    <div className="space-y-4">
      {createState.isLoading && <p role="status" className="text-sm text-muted-foreground">Creating blog post…</p>}
      <h1 className="text-xl font-semibold">Create Blog Post</h1>
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form ref={formRef} onSubmit={(e) => {
              if (submitting.current || imageUploading) { e.preventDefault(); return }
              void form.handleSubmit(onSubmit)(e)
            }} className="grid gap-4 md:grid-cols-2" aria-busy={createState.isLoading}>
              <fieldset disabled={createState.isLoading} className="contents">
              <div className="md:col-span-2">
                <FormRootError form={form} />
                {categoriesError && (
                  <p role="alert" className="text-sm text-destructive">
                    Could not load categories. <Button type="button" variant="link" size="sm" onClick={() => { void refetchCategories() }}>Retry</Button>
                  </p>
                )}
                {tagsError && (
                  <p role="alert" className="text-sm text-destructive">
                    Could not load tags. <Button type="button" variant="link" size="sm" onClick={() => { void refetchTags() }}>Retry</Button>
                  </p>
                )}
              </div>
              <BlogPostContentForm form={form} disabled={createState.isLoading} />
              <BlogPostMetaForm form={form} images={images} setImages={setImages} categoryOptions={categoryOptions} tagOptions={tagOptions} onImageUploadingChange={setImageUploading} disabled={createState.isLoading} />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createState.isLoading || imageUploading}>
                  {createState.isLoading ? 'Creating…' : 'Create Post'}
                </Button>
              </div>
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default BlogEditor
