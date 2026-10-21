import { useForm } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/ui/rich-text-editor'
import MultiSelect from '@/components/ui/multi-select'
import ImageUpload from '@/components/common/media/ImageUpload'
import type { BlogPostForm } from '@/lib/blogValidation'

export const BlogPostContentForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>>; disabled?: boolean }> = ({ form, disabled = false }) => (
  <>
    <div className="md:col-span-2"><FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Finding Your Dream Home in Mumbai" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content (HTML or Markdown)</FormLabel><FormControl><div className="overflow-hidden rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md"><RichTextEditor value={field.value} onChange={field.onChange} disabled={disabled} /></div></FormControl><FormMessage /></FormItem>)} /></div>
    <div className="md:col-span-2"><FormField control={form.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>Excerpt</FormLabel><FormControl><Textarea rows={3} placeholder="Short summary (optional)" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
  </>
)

export const BlogPostMetaForm: React.FC<{ form: ReturnType<typeof useForm<BlogPostForm>>; images: string[]; setImages: React.Dispatch<React.SetStateAction<string[]>>; categoryOptions: { value: string; label: string }[]; tagOptions: { value: string; label: string }[]; onImageUploadingChange?: (uploading: boolean) => void; disabled?: boolean }> = ({ form, images, setImages, categoryOptions, tagOptions, onImageUploadingChange, disabled = false }) => (
  <>
    <div className="md:col-span-2">
      <FormLabel>Cover Image</FormLabel>
      <ImageUpload
        onUploadingChange={onImageUploadingChange}
        disabled={disabled}
        value={images}
        onChange={(urls) => {
          if (disabled) return
          const cover = urls[urls.length - 1] ?? ''
          setImages(cover ? [cover] : [])
          form.setValue('cover_image_url', cover, { shouldDirty: true })
        }}
        multiple={false}
        primary={images[0] || null}
        onPrimaryChange={(url) => {
          if (disabled) return
          if (url) setImages((current) => [url, ...current.filter((image) => image !== url)])
          form.setValue('cover_image_url', url ?? '', { shouldDirty: true })
        }}
      />
      <div className="mt-2"><FormField control={form.control} name="cover_image_url" render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Cover Image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    </div>
    <div><FormField control={form.control} name="categories" render={({ field }) => (<FormItem><FormLabel>Categories</FormLabel><FormControl><MultiSelect options={categoryOptions} selected={field.value || []} onChange={(selected) => { if (!disabled) field.onChange(selected) }} disabled={disabled} placeholder="Select categories..." emptyMessage="No categories found. Create some first!" /></FormControl><FormMessage /></FormItem>)} /></div>
    <div><FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><MultiSelect options={tagOptions} selected={field.value || []} onChange={(selected) => { if (!disabled) field.onChange(selected) }} disabled={disabled} placeholder="Select tags..." emptyMessage="No tags found. Create some first!" /></FormControl><FormMessage /></FormItem>)} /></div>
    <div>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select
              disabled={disabled}
              value={field.value}
              onValueChange={(value) => {
                if (disabled) return
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
    {/* SEO overrides. The backend fills sensible values when these are blank. */}
    <fieldset className="md:col-span-2 grid gap-4 md:grid-cols-2" disabled={disabled}>
      <legend className="text-sm font-medium mb-2">SEO</legend>
      <FormField control={form.control} name="meta_title" render={({ field }) => (<FormItem><FormLabel>Meta title</FormLabel><FormControl><Input maxLength={60} placeholder="Up to 60 characters" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="focus_keyword" render={({ field }) => (<FormItem><FormLabel>Focus keyword</FormLabel><FormControl><Input maxLength={200} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="meta_description" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Meta description</FormLabel><FormControl><Textarea rows={2} maxLength={160} placeholder="Up to 160 characters" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="canonical_url" render={({ field }) => (<FormItem><FormLabel>Canonical URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="og_image_url" render={({ field }) => (<FormItem><FormLabel>Social share image URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
    </fieldset>
  </>
)
