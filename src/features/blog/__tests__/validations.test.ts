import { describe, it, expect } from 'vitest'
import { blogPostSchema } from '@/lib/blogValidation'
import { cmsPageSchema } from '@/features/core/validations'

describe('blogPostSchema', () => {
  const base = {
    title: 'My Post',
    content: 'Body with at least ten characters',
    status: 'draft',
  }

  it('accepts a valid draft', () => {
    expect(blogPostSchema.safeParse(base).success).toBe(true)
  })

  it('rejects content shorter than 10 characters', () => {
    expect(blogPostSchema.safeParse({ ...base, content: 'short' }).success).toBe(false)
  })

  it('requires a scheduled_at when status is scheduled', () => {
    const withoutDate = blogPostSchema.safeParse({ ...base, status: 'scheduled' })
    expect(withoutDate.success).toBe(false)

    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(blogPostSchema.safeParse({ ...base, status: 'scheduled', scheduled_at: future }).success).toBe(true)
  })

  it('rejects an invalid cover image URL', () => {
    expect(blogPostSchema.safeParse({ ...base, cover_image_url: 'not-a-url' }).success).toBe(false)
  })
})

describe('cmsPageSchema', () => {
  const base = {
    title: 'About',
    unique_name: 'about',
    content: '<p>Hello</p>',
    format: 'html',
    is_active: true,
    is_draft: false,
  }

  it('accepts valid JSON custom config', () => {
    expect(
      cmsPageSchema.safeParse({ ...base, custom_config_text: '{"theme": "dark"}' }).success,
    ).toBe(true)
  })

  it('rejects invalid JSON custom config', () => {
    expect(
      cmsPageSchema.safeParse({ ...base, custom_config_text: '{oops' }).success,
    ).toBe(false)
  })

  it('rejects invalid unique_name characters', () => {
    expect(cmsPageSchema.safeParse({ ...base, unique_name: 'About Us!' }).success).toBe(false)
  })
})
