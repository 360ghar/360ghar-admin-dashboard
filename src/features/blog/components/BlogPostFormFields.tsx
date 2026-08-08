import { useForm } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/ui/rich-text-editor'
import MultiSelect from '@/components/ui/multi-select'
import ImageUpload from '@/components/common/media/ImageUpload'
import type { BlogPostForm } from '@/lib/blogValidation'

export const BlogPostContentForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>> }> = ({ form }) => (
  <>
    <div className="md:col-span-2"><FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Finding Your Dream Home in Mumbai" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content (HTML or Markdown)</FormLabel><FormControl><div className="overflow-hidden rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md"><RichTextEditor value={field.value} onChange={field.onChange} /></div></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea rows={3} placeholder="Short summary (optional)" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
  </>
)

export const BlogPostMetaForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>>; images: string[]; setImages: (urls: string[]) => void; categoryOptions: { value: string; label: string }[]; tagOptions: { value: string; label: string }[] }> = ({ form, images, setImages, categoryOptions, tagOptions }) => (
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
