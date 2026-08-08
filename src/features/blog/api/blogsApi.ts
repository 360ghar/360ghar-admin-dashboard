import { api } from '@/store/api'
import type {
  BlogPost,
  BlogPostCreate,
  BlogPostUpdate,
  BlogPostFilters,
  BlogPostListResponse,
  BlogCategory,
  BlogCategoryCreate,
  BlogCategoryUpdate,
  BlogCategoryFilters,
  BlogCategoryListResponse,
  BlogTag,
  BlogTagCreate,
  BlogTagUpdate,
  BlogTagFilters,
  BlogTagListResponse,
  BlogGenerationResult,
} from '@/types/blog'

export const blogsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Blog Posts
    createBlogPost: builder.mutation<BlogPost, BlogPostCreate>({
      query: (data) => ({
        url: '/blog/posts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'BlogPost', id: 'LIST' }],
    }),

    getBlogPosts: builder.query<BlogPostListResponse, BlogPostFilters | void>({
      query: (params) => {
        const p = params || {}
        const search = new URLSearchParams()
        search.set('limit', String(p.limit || 20))
        if (p.cursor) search.set('cursor', p.cursor)
        if (p.q) search.set('q', p.q)
        if (Array.isArray(p.categories)) p.categories.forEach((c) => search.append('categories', c))
        if (Array.isArray(p.tags)) p.tags.forEach((t) => search.append('tags', t))
        if (Array.isArray(p.keywords)) p.keywords.forEach((k) => search.append('keywords', k))
        if (p.status) search.set('status', String(p.status))
        return { url: '/blog/posts', params: search }
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((b) => ({ type: 'BlogPost' as const, id: b.id })),
              { type: 'BlogPost' as const, id: 'LIST' },
            ]
          : [{ type: 'BlogPost' as const, id: 'LIST' }],
    }),

    getBlogPost: builder.query<BlogPost, string | number>({
      query: (identifier) => `/blog/posts/${identifier}`,
      providesTags: (_res, _e, id) => [{ type: 'BlogPost', id }],
    }),

    updateBlogPost: builder.mutation<BlogPost, { identifier: string | number; data: BlogPostUpdate }>({
      query: ({ identifier, data }) => ({
        url: `/blog/posts/${identifier}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _e, { identifier }) => [{ type: 'BlogPost', id: identifier }, { type: 'BlogPost', id: 'LIST' }],
    }),

    deleteBlogPost: builder.mutation<void, string | number>({
      query: (identifier) => ({
        url: `/blog/posts/${identifier}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, id) => [{ type: 'BlogPost', id }, { type: 'BlogPost', id: 'LIST' }],
    }),

    generateBlogFromTopic: builder.mutation<BlogGenerationResult, { topic: string }>({
      query: (data) => ({
        url: '/blog/generate-from-topic',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'BlogPost', id: 'LIST' }],
    }),

    generateBulkBlogs: builder.mutation<BlogGenerationResult[], { count: number }>({
      query: (data) => ({
        url: '/blog/generate-bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'BlogPost', id: 'LIST' }],
    }),

    // Blog Categories
    createBlogCategory: builder.mutation<BlogCategory, BlogCategoryCreate>({
      query: (data) => ({
        url: '/blog/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'BlogCategory', id: 'LIST' }],
    }),

    getBlogCategories: builder.query<BlogCategoryListResponse, BlogCategoryFilters | void>({
      query: (params) => {
        const p = params || {}
        const queryParams: Record<string, string | null> = { limit: String(p.limit || 20) }
        if (p.cursor) queryParams.cursor = p.cursor
        if (p.include_total) queryParams.include_total = 'true'
        return {
          url: '/blog/categories',
          params: queryParams,
        }
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: 'BlogCategory' as const, id: c.id })),
              { type: 'BlogCategory' as const, id: 'LIST' },
            ]
          : [{ type: 'BlogCategory' as const, id: 'LIST' }],
    }),

    getBlogCategory: builder.query<BlogCategory, string | number>({
      query: (identifier) => `/blog/categories/${identifier}`,
      providesTags: (_res, _e, id) => [{ type: 'BlogCategory', id }],
    }),

    updateBlogCategory: builder.mutation<BlogCategory, { identifier: string | number; data: BlogCategoryUpdate }>({
      query: ({ identifier, data }) => ({
        url: `/blog/categories/${identifier}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _e, { identifier }) => [{ type: 'BlogCategory', id: identifier }, { type: 'BlogCategory', id: 'LIST' }],
    }),

    deleteBlogCategory: builder.mutation<void, string | number>({
      query: (identifier) => ({
        url: `/blog/categories/${identifier}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, id) => [{ type: 'BlogCategory', id }, { type: 'BlogCategory', id: 'LIST' }],
    }),

    // Blog Tags
    createBlogTag: builder.mutation<BlogTag, BlogTagCreate>({
      query: (data) => ({
        url: '/blog/tags',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'BlogTag', id: 'LIST' }],
    }),

    getBlogTags: builder.query<BlogTagListResponse, BlogTagFilters | void>({
      query: (params) => {
        const p = params || {}
        const queryParams: Record<string, string | null> = { limit: String(p.limit || 20) }
        if (p.cursor) queryParams.cursor = p.cursor
        if (p.include_total) queryParams.include_total = 'true'
        return {
          url: '/blog/tags',
          params: queryParams,
        }
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((t) => ({ type: 'BlogTag' as const, id: t.id })),
              { type: 'BlogTag' as const, id: 'LIST' },
            ]
          : [{ type: 'BlogTag' as const, id: 'LIST' }],
    }),

    getBlogTag: builder.query<BlogTag, string | number>({
      query: (identifier) => `/blog/tags/${identifier}`,
      providesTags: (_res, _e, id) => [{ type: 'BlogTag', id }],
    }),

    updateBlogTag: builder.mutation<BlogTag, { identifier: string | number; data: BlogTagUpdate }>({
      query: ({ identifier, data }) => ({
        url: `/blog/tags/${identifier}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _e, { identifier }) => [{ type: 'BlogTag', id: identifier }, { type: 'BlogTag', id: 'LIST' }],
    }),

    deleteBlogTag: builder.mutation<void, string | number>({
      query: (identifier) => ({
        url: `/blog/tags/${identifier}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, id) => [{ type: 'BlogTag', id }, { type: 'BlogTag', id: 'LIST' }],
    }),
  }),
})

export const {
  // Blog Posts
  useCreateBlogPostMutation,
  useGetBlogPostsQuery,
  useGetBlogPostQuery,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
  useGenerateBlogFromTopicMutation,
  useGenerateBulkBlogsMutation,
  // Blog Categories
  useCreateBlogCategoryMutation,
  useGetBlogCategoriesQuery,
  useGetBlogCategoryQuery,
  useUpdateBlogCategoryMutation,
  useDeleteBlogCategoryMutation,
  // Blog Tags
  useCreateBlogTagMutation,
  useGetBlogTagsQuery,
  useGetBlogTagQuery,
  useUpdateBlogTagMutation,
  useDeleteBlogTagMutation,
} = blogsApi
