import type { PaginatedResponse } from './api'

export interface BlogCategory {
  id: number
  name: string
  slug: string
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface BlogTag {
  id: number
  name: string
  slug: string
  created_at?: string | null
  updated_at?: string | null
}

// Blog lifecycle status (kept in sync with backend BlogPostStatus enum).
export type BlogPostStatus = 'draft' | 'published' | 'archived' | 'scheduled'

export const BLOG_POST_STATUSES: BlogPostStatus[] = ['draft', 'published', 'archived', 'scheduled']

export interface BlogPost {
  id: number
  title: string
  slug: string
  content: string
  excerpt?: string | null
  cover_image_url?: string | null
  /**
   * Lifecycle status of the post. Newer posts always carry this; legacy posts
   * may lack it, in which case callers should fall back to `active`.
   * Known values: 'draft' | 'published' | 'archived' | 'scheduled'.
   */
  status: string
  /** ISO timestamp the post is scheduled to go live (required when status === 'scheduled'). */
  scheduled_at?: string | null
  /** ISO timestamp the post was published (set by backend when status flips to published). */
  published_at?: string | null
  /** Shared secret token allowing unauthenticated preview of draft/scheduled posts. */
  preview_token?: string | null
  /** @deprecated Replaced by `status`. Backend keeps it in sync: `active === (status === 'published')`. */
  active?: boolean
  categories?: BlogCategory[]
  tags?: BlogTag[]
  author_id?: number
  created_at: string
  updated_at?: string | null
}

// List Response Types — uniform cursor-paginated shape
export type BlogPostListResponse = PaginatedResponse<BlogPost>

export type BlogCategoryListResponse = PaginatedResponse<BlogCategory>

export type BlogTagListResponse = PaginatedResponse<BlogTag>

// Filter Types
export interface BlogPostFilters {
  q?: string
  categories?: string[]
  tags?: string[]
  keywords?: string[]
  status?: string
  cursor?: string | null
  limit?: number
}

export interface BlogCategoryFilters {
  cursor?: string | null
  limit?: number
  include_total?: boolean
}

export interface BlogTagFilters {
  cursor?: string | null
  limit?: number
  include_total?: boolean
}

// Create/Update Types
export interface BlogPostCreate {
  title: string
  content: string
  excerpt?: string
  cover_image_url?: string
  categories?: string[]
  tags?: string[]
  /**
   * New lifecycle status. When provided, the backend derives `active`
   * (`active === (status === 'published')`) and overrides any `active` value.
   * Known values: 'draft' | 'published' | 'archived' | 'scheduled'.
   */
  status?: string
  /** ISO timestamp, required when `status === 'scheduled'`. */
  scheduled_at?: string | null
  /** @deprecated Use `status` instead. Kept for backwards compatibility. */
  active?: boolean
}

export interface BlogPostUpdate {
  title?: string
  content?: string
  excerpt?: string
  cover_image_url?: string
  categories?: string[]
  tags?: string[]
  /**
   * New lifecycle status. When provided, the backend derives `active`
   * (`active === (status === 'published')`) and overrides any `active` value.
   * Known values: 'draft' | 'published' | 'archived' | 'scheduled'.
   */
  status?: string
  /** ISO timestamp, required when `status === 'scheduled'`. Send `null` to clear. */
  scheduled_at?: string | null
  /** @deprecated Use `status` instead. Kept for backwards compatibility. */
  active?: boolean
}

export interface BlogCategoryCreate {
  name: string
  description?: string
}

export interface BlogCategoryUpdate {
  name?: string
  description?: string
}

export interface BlogTagCreate {
  name: string
}

export interface BlogTagUpdate {
  name: string
}

export interface BlogGenerationResult {
  blog: BlogPost
  images: string[]
}
