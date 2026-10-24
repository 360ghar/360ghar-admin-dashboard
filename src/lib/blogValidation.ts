import { z } from 'zod'

// Blog Post validation schema
export const blogPostSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters'),
    content: z
      .string()
      .min(10, 'Content must be at least 10 characters'),
    excerpt: z
      .string()
      .max(1000, 'Excerpt must be less than 1000 characters')
      .optional()
      .or(z.literal('')),
    cover_image_url: z
      .string()
      .url('Invalid URL format')
      .optional()
      .or(z.literal('')),
    status: z
      .enum(['draft', 'published', 'archived', 'scheduled'])
      .default('draft'),
    scheduled_at: z
      .string()
      .optional()
      .or(z.literal('')),
    categories: z
      .array(z.string())
      .optional(),
    tags: z
      .array(z.string())
      .optional(),
    // SEO fields. Limits match the backend: meta title 60, meta description 160, keyword 200, URLs 500.
    meta_title: z.string().max(60, 'Keep the meta title under 60 characters').optional().or(z.literal('')),
    meta_description: z.string().max(160, 'Keep the meta description under 160 characters').optional().or(z.literal('')),
    focus_keyword: z.string().max(200, 'Keep the focus keyword under 200 characters').optional().or(z.literal('')),
    canonical_url: z.string().url('Invalid URL format').max(500, 'Keep the URL under 500 characters').optional().or(z.literal('')),
    og_image_url: z.string().url('Invalid URL format').max(500, 'Keep the URL under 500 characters').optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // When the post is scheduled, a future scheduled_at timestamp is required.
    if (data.status === 'scheduled') {
      const raw = data.scheduled_at?.trim()
      if (!raw) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduled_at'],
          message: 'A publish date is required when status is Scheduled',
        })
        return
      }
      const parsed = new Date(raw)
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduled_at'],
          message: 'Enter a valid date and time',
        })
        return
      }
      if (parsed.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduled_at'],
          message: 'Scheduled date must be in the future',
        })
      }
    }
  })

// Blog Category validation schema
export const blogCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
})

// Blog Tag validation schema
export const blogTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
})

// Export inferred types
export type BlogPostForm = z.infer<typeof blogPostSchema>
export type BlogPostFormInput = z.input<typeof blogPostSchema>
export type BlogCategoryForm = z.infer<typeof blogCategorySchema>
export type BlogTagForm = z.infer<typeof blogTagSchema>
