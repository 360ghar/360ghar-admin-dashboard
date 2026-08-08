import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { BlogPostContentForm, BlogPostMetaForm } from '@/features/blog/components/BlogPostFormFields'
import { useCreateBlogPostMutation, useGetBlogCategoriesQuery, useGetBlogTagsQuery } from '@/features/blog/api/blogsApi'
import { useToast } from '@/hooks/use-toast'
import { blogPostSchema, type BlogPostForm } from '@/lib/blogValidation'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { localInputToServerTimestamp } from '@/lib/dateTime'
import type { BlogCategory, BlogTag } from '@/types/blog'

const BlogEditor = ({ onSuccess }: { onSuccess?: (slug: string) => void }) => {
  const { toast } = useToast()
  const [createBlogPost, createState] = useCreateBlogPostMutation()

  // Fetch categories and tags
  const { data: categoriesData } = useGetBlogCategoriesQuery({ limit: 100 })
  const { data: tagsData } = useGetBlogTagsQuery({ limit: 100 })

  const form = useForm<BlogPostForm>({
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
    },
  })

  const { setValue } = form
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (images.length) setValue('cover_image_url', images[0] || '')
  }, [images, setValue])

  const onSubmit = async (values: BlogPostForm) => {
    form.clearErrors()
    try {
      const payload = {
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
      }

      const res = await createBlogPost(payload).unwrap()
      toast({ title: 'Created', description: 'Blog post created successfully' })
      onSuccess?.(res.slug)
    } catch (e: unknown) {
      applyServerValidation(e, form.setError)
      toast({ title: 'Save failed', description: getErrorMessage(e, 'Please check inputs'), variant: 'destructive' })
    }
  }

  // Prepare category and tag options for multi-select
  const categoryOptions = categoriesData?.items?.map((cat: BlogCategory) => ({
    value: cat.slug,
    label: cat.name,
  })) || []

  const tagOptions = tagsData?.items?.map((tag: BlogTag) => ({
    value: tag.slug,
    label: tag.name,
  })) || []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create Blog Post</h1>
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormRootError form={form} />
              </div>
              <BlogPostContentForm form={form} />
              <BlogPostMetaForm form={form} images={images} setImages={setImages} categoryOptions={categoryOptions} tagOptions={tagOptions} />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createState.isLoading}>
                  {createState.isLoading ? 'Creating…' : 'Create Post'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default BlogEditor
