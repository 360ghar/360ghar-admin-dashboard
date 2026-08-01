import { api } from '@/store/api'
import type { SwipeListResponse } from '@/types/api'

export interface SwipeRequest {
    property_id: number
    is_liked: boolean
}

export interface SwipeResponse {
    success: boolean
    match?: boolean
}

export interface SwipeListParams {
    cursor?: string | null
    limit?: number
    is_liked?: boolean
    q?: string
    city?: string
    property_type?: string
    purpose?: string
    price_min?: number
    price_max?: number
}

export const swipesApi = api.injectEndpoints({
    endpoints: (builder) => ({
        swipeProperty: builder.mutation<SwipeResponse, SwipeRequest>({
            query: (data) => ({
                url: '/swipes',
                method: 'POST',
                body: data,
            }),
            // Only swipe history — do not invalidate RECOMMENDATIONS mid-deck
            // (would re-order/shorten the feed and desync currentIndex).
            invalidatesTags: [{ type: 'Swipe', id: 'LIST' }],
        }),
        listSwipes: builder.query<SwipeListResponse, SwipeListParams | void>({
            query: (params) => ({
                url: '/swipes',
                params: { limit: 20, ...(params || {}) },
            }),
            providesTags: [{type: 'Swipe' as const, id: 'LIST'}],
        }),
        undoLastSwipe: builder.mutation<void, void>({
            query: () => ({
                url: '/swipes/undo',
                method: 'DELETE',
            }),
            invalidatesTags: [{type: 'Swipe', id: 'LIST'}],
        }),
        toggleSwipeLike: builder.mutation<void, { swipeId: number | string }>({
            query: ({ swipeId }) => ({
                url: `/swipes/${swipeId}/toggle`,
                method: 'PUT',
            }),
            invalidatesTags: [{type: 'Swipe', id: 'LIST'}],
        }),
    }),
})

export const {
    useSwipePropertyMutation,
    useListSwipesQuery,
    useUndoLastSwipeMutation,
    useToggleSwipeLikeMutation,
} = swipesApi
