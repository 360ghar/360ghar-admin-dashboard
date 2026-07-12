import { api } from '@/store/api'
import type { UploadResponse } from '@/types/api'

export const uploadApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Upload file
    uploadFile: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
})

export const {
  useUploadFileMutation,
} = uploadApi