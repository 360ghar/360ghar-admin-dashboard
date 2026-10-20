import type { BlogPost, BlogPostStatus } from '@/types/blog'
import { BLOG_POST_STATUSES } from '@/types/blog'

/**
 * Display metadata for each blog lifecycle status.
 * - className: Tailwind classes for a colored Badge variant (overlays the shadcn outline variant).
 * - label: Human-readable label shown in selects, badges, and toasts.
 */
export const BLOG_STATUS_META: Record<
  BlogPostStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className:
      'bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-300 dark:border-gray-400/20',
  },
  published: {
    label: 'Published',
    className:
      'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-300 dark:border-green-400/20',
  },
  archived: {
    label: 'Archived',
    className:
      'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300 dark:border-red-400/20',
  },
  scheduled: {
    label: 'Scheduled',
    className:
      'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:border-blue-400/20',
  },
}

export function isBlogPostStatus(value: string | null | undefined): value is BlogPostStatus {
  return value != null && (BLOG_POST_STATUSES as readonly string[]).includes(value)
}

/**
 * A post's status, exactly as the backend sends it. `status` is never null on the backend, but the
 * response schema types it as a plain string, so an unknown value reads as null instead of a real status.
 */
export function resolveBlogStatus(post: Pick<BlogPost, 'status'>): BlogPostStatus | null {
  return isBlogPostStatus(post.status) ? post.status : null
}

/** Tailwind classes for a status badge. An unknown status gets the neutral draft styling. */
export function blogStatusBadgeClass(status: string | null | undefined): string {
  return isBlogPostStatus(status) ? BLOG_STATUS_META[status].className : BLOG_STATUS_META.draft.className
}

/** Human-readable label for a status. An unknown status reads "Unknown". */
export function blogStatusLabel(status: string | null | undefined): string {
  return isBlogPostStatus(status) ? BLOG_STATUS_META[status].label : 'Unknown'
}
