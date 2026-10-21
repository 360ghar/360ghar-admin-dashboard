import { api } from '@/store/api'
import type { components } from '@/lib/api/schema.gen'
import type { ListingModerationStatus, UserReportStatus } from '@/types/api'
import type {
  ModerationAction,
  ModerationQueueResponse,
  ReportModerationAction,
  ReportsQueueResponse,
} from '../types'

interface QueueParams<Status extends string> {
  status?: Status
  limit?: number
  cursor?: string | null
}

/** `{ listing_id, action, status, reason }` */
type ListingModerationResult = components['schemas']['ListingModerationResult']
/** `{ report_id, action, status, moderator_notes }`. The moderator text no longer overwrites the reporter text. */
type ReportModerationResult = components['schemas']['ReportModerationResult']

export const flatmatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPendingListings: builder.query<ModerationQueueResponse, QueueParams<ListingModerationStatus> | void>({
      query: (params) => ({
        url: '/flatmates/moderation/listings',
        params: {
          status: params?.status ?? 'pending_review',
          limit: params?.limit ?? 50,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((listing) => ({
                type: 'FlatmatesListing' as const,
                id: listing.id,
              })),
              { type: 'FlatmatesListing' as const, id: 'LIST' },
            ]
          : [{ type: 'FlatmatesListing' as const, id: 'LIST' }],
    }),
    moderateListing: builder.mutation<
      ListingModerationResult,
      { listingId: number; payload: ModerationAction }
    >({
      query: ({ listingId, payload }) => ({
        url: `/flatmates/moderation/listings/${listingId}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'FlatmatesListing', id: listingId },
        { type: 'FlatmatesListing', id: 'LIST' },
        { type: 'Property', id: listingId },
        { type: 'Property', id: 'LIST' },
        { type: 'Property', id: 'RECOMMENDATIONS' },
      ],
    }),
    getPendingReports: builder.query<ReportsQueueResponse, QueueParams<UserReportStatus> | void>({
      query: (params) => ({
        url: '/flatmates/moderation/reports',
        params: {
          status: params?.status ?? 'open',
          limit: params?.limit ?? 50,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((report) => ({
                type: 'FlatmatesReport' as const,
                id: report.id,
              })),
              { type: 'FlatmatesReport' as const, id: 'LIST' },
            ]
          : [{ type: 'FlatmatesReport' as const, id: 'LIST' }],
    }),
    moderateReport: builder.mutation<
      ReportModerationResult,
      { reportId: number; payload: ReportModerationAction }
    >({
      query: ({ reportId, payload }) => ({
        url: `/flatmates/moderation/reports/${reportId}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { reportId, payload }) => [
        { type: 'FlatmatesReport', id: reportId },
        { type: 'FlatmatesReport', id: 'LIST' },
        ...(payload.action === 'suspend_user' ? [{ type: 'User' as const }] : []),
      ],
    }),
  }),
})

export const {
  useGetPendingListingsQuery,
  useModerateListingMutation,
  useGetPendingReportsQuery,
  useModerateReportMutation,
} = flatmatesApi
