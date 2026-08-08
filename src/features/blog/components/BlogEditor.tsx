import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MultiSelect from '@/components/ui/multi-select'
import ImageUpload from '@/components/common/media/ImageUpload'
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
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Finding Your Dream Home in Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (HTML or Markdown)</FormLabel>
                      <FormControl>
                        <div className="overflow-hidden rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md">
                          <RichTextEditor value={field.value} onChange={field.onChange} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Short summary (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormLabel>Cover Image</FormLabel>
                <ImageUpload value={images} onChange={setImages} multiple={false} primary={images[0] || null} onPrimaryChange={(u) => { setImages(prev => { const filtered = prev.filter(i => i !== u); return u ? [u, ...filtered] : prev }) }} />
                <div className="mt-2">
                  <FormField
                    control={form.control}
                    name="cover_image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Cover Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={categoryOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select categories..."
                          emptyMessage="No categories found. Create some first!"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                  <FormItem className={form.watch('status') === 'scheduled' ? '' : 'hidden'}>
                    <FormLabel>Scheduled Publish Date &amp; Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        placeholder="Pick a future date and time"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Required when status is Scheduled.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={tagOptions}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Select tags..."
                          emptyMessage="No tags found. Create some first!"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
