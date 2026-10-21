/**
 * Blog types. Wire types alias the generated OpenAPI components
 * (`src/lib/api/schema.gen.ts`); only the UI filter shapes are hand-written.
 */
import type { components, paths } from '@/lib/api/schema.gen'
import type { CursorPage } from './api'

type S = components['schemas']

export type BlogCategory = S['BlogCategory']
export type BlogTag = S['BlogTag']

/** Blog lifecycle status, exactly as the backend sends it. */
export type BlogPostStatus = S['BlogPostStatus']

export const BLOG_POST_STATUSES: BlogPostStatus[] = ['draft', 'published', 'archived', 'scheduled']

/** A post as returned by the list and detail routes. It never carries `preview_token`. */
export type BlogPost = S['BlogPost']
/** A post as returned by create and update. Adds `author_id` and `preview_token`. */
export type BlogPostAdmin = S['BlogPostAdmin']

// List Response Types
export type BlogPostListResponse = CursorPage<BlogPost>
export type BlogCategoryListResponse = CursorPage<BlogCategory>
export type BlogTagListResponse = CursorPage<BlogTag>

// Filter Types. Query keys come from the spec: `keywords` and `category_id` are gone.
type BlogPostsQuery = NonNullable<paths['/api/v1/blog/posts']['get']['parameters']['query']>
export type BlogPostFilters = Pick<BlogPostsQuery, 'q' | 'categories' | 'tags' | 'status' | 'limit'> & {
  cursor?: string | null
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

// Create/Update Types. PUT is PATCH-style: send only changed keys, and an
// explicit null (or an empty array) clears excerpt, cover_image_url,
// categories and tags.
export type BlogPostCreate = S['BlogPostCreate']
export type BlogPostUpdate = S['BlogPostUpdate']
export type BlogCategoryCreate = S['BlogCategoryCreate']
export type BlogCategoryUpdate = S['BlogCategoryUpdate']
export type BlogTagCreate = S['BlogTagCreate']
export type BlogTagUpdate = S['BlogTagUpdate']

export type BlogGenerationResult = S['BlogGenerationResult']
