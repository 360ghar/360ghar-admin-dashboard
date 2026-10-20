import { api } from '@/store/api'
import type { components } from '@/lib/api/schema.gen'
import type {
  BugReport,
  BugReportCreate,
  BugReportUpdate,
  BugReportsQuery,
  Page,
  PageCreate,
  PageUpdate,
  PagesQuery,
  AppUpdate,
  AppUpdateCreate,
  AppUpdateUpdate,
  AppUpdatesQuery,
  HealthResponse,
  PaginatedResponse,
} from '@/types/api'
import { API_BASE_URL } from '@/lib/config'

const apiBaseUrl = API_BASE_URL.replace(/\/$/, '')
const apiRootUrl = apiBaseUrl.replace(/\/api\/v1$/, '')

// FAQ types. `display_order` is an integer (default 0) and is never null.
export type Faq = components['schemas']['FAQResponse']
export type FaqCreate = components['schemas']['FAQCreate']
export type FaqUpdate = components['schemas']['FAQUpdate']

export interface FaqsQuery {
  category?: string
  is_active?: boolean
  limit?: number
  cursor?: string | null
}

export const coreApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Bug Reports
    createBugReport: builder.mutation<BugReport, BugReportCreate>({
      query: (data) => ({
        url: '/bugs',
        method: 'POST',
        body: data
      }),
      invalidatesTags: [{type: 'BugReport', id: 'LIST'}]
    }),

    createBugReportWithMedia: builder.mutation<BugReport, FormData>({
      query: (formData) => ({
        url: '/bugs/with-media',
        method: 'POST',
        body: formData,
        formData: true
      }),
      invalidatesTags: [{type: 'BugReport', id: 'LIST'}]
    }),

    getBugReports: builder.query<PaginatedResponse<BugReport>, BugReportsQuery | void>({
      query: (params) => ({
        url: '/bugs',
        params: { limit: 20, ...(params || {}) }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((b) => ({ type: 'BugReport' as const, id: b.id })),
              { type: 'BugReport' as const, id: 'LIST' },
            ]
          : [{ type: 'BugReport' as const, id: 'LIST' }],
    }),

    updateBugReport: builder.mutation<BugReport, { id: number; data: BugReportUpdate }>({
      query: ({ id, data }) => ({
        url: `/bugs/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { id }) => [{ type: 'BugReport', id }, { type: 'BugReport', id: 'LIST' }]
    }),

    // Pages Management
    createPage: builder.mutation<Page, PageCreate>({
      query: (data) => ({
        url: '/pages',
        method: 'POST',
        body: data
      }),
      invalidatesTags: [{type: 'Page', id: 'LIST'}]
    }),

    getPages: builder.query<PaginatedResponse<Page>, PagesQuery | void>({
      query: (params) => ({
        url: '/pages',
        params: { limit: 20, ...(params || {}) }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: 'Page' as const, id: p.unique_name })),
              { type: 'Page' as const, id: 'LIST' },
            ]
          : [{ type: 'Page' as const, id: 'LIST' }],
    }),

    updatePage: builder.mutation<Page, { uniqueName: string; data: PageUpdate }>({
      query: ({ uniqueName, data }) => ({
        url: `/pages/${uniqueName}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { uniqueName }) => [{ type: 'Page', id: uniqueName }, { type: 'Page', id: 'LIST' }]
    }),

    deletePage: builder.mutation<void, string>({
      query: (uniqueName) => ({
        url: `/pages/${uniqueName}`,
        method: 'DELETE'
      }),
      invalidatesTags: (res, _e, uniqueName) => [{ type: 'Page', id: uniqueName }, { type: 'Page', id: 'LIST' }],
    }),

    // App Versions
    createAppUpdate: builder.mutation<AppUpdate, AppUpdateCreate>({
      query: (data) => ({
        url: '/versions',
        method: 'POST',
        body: data
      }),
      invalidatesTags: [{type: 'AppUpdate', id: 'LIST'}]
    }),

    getAppUpdates: builder.query<PaginatedResponse<AppUpdate>, AppUpdatesQuery | void>({
      query: (params) => ({
        url: '/versions',
        params: { limit: 10, ...(params || {}) }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((u) => ({ type: 'AppUpdate' as const, id: u.id })),
              { type: 'AppUpdate' as const, id: 'LIST' },
            ]
          : [{ type: 'AppUpdate' as const, id: 'LIST' }],
    }),

    updateAppUpdate: builder.mutation<AppUpdate, { id: number; data: AppUpdateUpdate }>({
      query: ({ id, data }) => ({
        url: `/versions/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { id }) => [{ type: 'AppUpdate', id }, { type: 'AppUpdate', id: 'LIST' }]
    }),

    // FAQs
    createFaq: builder.mutation<Faq, FaqCreate>({
      query: (data) => ({
        url: '/faqs',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Faq', id: 'LIST' }],
    }),

    getFaqs: builder.query<PaginatedResponse<Faq>, FaqsQuery | void>({
      query: (params) => ({
        url: '/faqs',
        params: { limit: 100, ...(params || {}) },
      }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((f) => ({ type: 'Faq' as const, id: f.id })), { type: 'Faq' as const, id: 'LIST' }]
          : [{ type: 'Faq' as const, id: 'LIST' }],
    }),

    updateFaq: builder.mutation<Faq, { id: number; data: FaqUpdate }>({
      query: ({ id, data }) => ({
        url: `/faqs/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'Faq', id }, { type: 'Faq', id: 'LIST' }],
    }),

    deleteFaq: builder.mutation<void, number>({
      query: (id) => ({
        url: `/faqs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _e, id) => [{ type: 'Faq', id }, { type: 'Faq', id: 'LIST' }],
    }),

    // Health Check. `/health` is a root route that OpenAPI does not describe (see HealthResponse).
    healthCheck: builder.query<HealthResponse, void>({
      query: () => ({ url: `${apiRootUrl}/health` })
    }),
  }),
})

export const {
  useCreateBugReportMutation,
  useCreateBugReportWithMediaMutation,
  useGetBugReportsQuery,
  useUpdateBugReportMutation,
  useCreatePageMutation,
  useGetPagesQuery,
  useUpdatePageMutation,
  useDeletePageMutation,
  useCreateAppUpdateMutation,
  useGetAppUpdatesQuery,
  useUpdateAppUpdateMutation,
  useCreateFaqMutation,
  useGetFaqsQuery,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
  useHealthCheckQuery,
} = coreApi
