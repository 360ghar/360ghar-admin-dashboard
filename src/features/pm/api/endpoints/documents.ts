import { pmMaintenanceApi } from './maintenance'
import type { PaginatedResponse } from '@/types/api'
import type { Document, DocumentUpdate, PmDocumentsQuery } from '@/types/pm'
import { withPageLimit } from './pmParams'

// The backend has no DELETE for a document: a document can be referenced by a lease or a receipt.
export const pmDocumentsApi = pmMaintenanceApi.injectEndpoints({
  endpoints: (builder) => ({
    // multipart form (`Body_upload_document_api_v1_pm_documents_upload_post`). 201 with the document.
    uploadPmDocument: builder.mutation<Document, FormData>({
      query: (formData) => ({
        url: '/pm/documents/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'PmDocument', id: 'LIST' }, {type: 'PmDashboard', id: 'LIST'}],
    }),

    // `file_url` on each row is the delivery URL for this viewer, or null when the viewer may not open the file.
    listPmDocuments: builder.query<PaginatedResponse<Document>, PmDocumentsQuery>({
      query: (args) => ({ url: '/pm/documents', params: withPageLimit(args) }),
      providesTags: (res) =>
        res?.items
          ? [...res.items.map((d) => ({ type: 'PmDocument' as const, id: d.id })), { type: 'PmDocument' as const, id: 'LIST' }]
          : [{ type: 'PmDocument' as const, id: 'LIST' }],
    }),

    updatePmDocument: builder.mutation<Document, { document_id: number; payload: DocumentUpdate }>({
      query: ({ document_id, payload }) => ({
        url: `/pm/documents/${document_id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_res, _e, { document_id }) => [{ type: 'PmDocument', id: document_id }, { type: 'PmDocument', id: 'LIST' }],
    }),
  }),
})
