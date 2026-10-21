import { api } from '@/store/api'
import type { SwipeResult } from '@/types/api'
import type { components } from '@/lib/api/schema.gen'

/** Body of `POST /swipes`: only `property_id` and `is_liked` (any other key is a 422). */
export type SwipeRequest = components['schemas']['SwipeCreate']

export const swipesApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // 201 for a new swipe, 200 when an existing swipe is updated. The body is `{ id, property_id, is_liked }`.
        // There is no match flag: a swipe on a property never produces a match.
        // Errors: 404 PROPERTY_NOT_FOUND, 403 OWN_PROPERTY_SWIPE.
        swipeProperty: builder.mutation<SwipeResult, SwipeRequest>({
            query: (data) => ({
                url: '/swipes',
                method: 'POST',
                body: data,
            }),
            // Search reflects liked/excluded properties. Keep the active deck
            // stable; RECOMMENDATIONS has a separate tag.
            invalidatesTags: [{ type: 'Swipe', id: 'LIST' }, { type: 'Property', id: 'LIST' }],
        }),
    }),
})

export const {
    useSwipePropertyMutation,
} = swipesApi
