import { api } from '@/store/api'
import type {
  Booking,
  BookingStaff,
  BookingStatus,
  BookingCancel,
  BookingCreate,
  BookingUpdate,
  BookingAvailability,
  BookingOccupancyCheck,
  BookingOccupancyResult,
  BookingPricing,
  BookingPayment,
  BookingReview,
  BookingsQuery as AllBookingsQuery,
  PaginatedResponse,
} from '@/types/api'

/**
 * Query of `GET /bookings/all` (admin and agent). `q` searches booking reference, guest name,
 * guest email and property title. `payment_status` is a `PaymentStatus` (pending, partial, paid, refunded, failed).
 */
export type BookingsQuery = AllBookingsQuery

export interface BookingsCursorQuery {
  cursor?: string | null
  limit?: number
  include_total?: boolean
  status?: BookingStatus
}

export const bookingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Create a booking. Admins and agents may set `user_id` (the guest); other callers always own the booking.
    createBooking: builder.mutation<Booking | BookingStaff, BookingCreate>({
      query: (data) => ({
        url: '/bookings',
        method: 'POST',
        body: data
      }),
      invalidatesTags: [{type: 'Booking', id: 'LIST'}, {type: 'Property', id: 'LIST'}]
    }),

    // Get current user's bookings (guest shape: no internal_notes)
    getUserBookings: builder.query<PaginatedResponse<Booking>, BookingsCursorQuery | void>({
      query: (params) => ({
        url: '/bookings',
        params: params
          ? {
              limit: params.limit ?? 20,
              cursor: params.cursor ?? undefined,
              status: params.status ?? undefined,
              ...(params.include_total ? { include_total: true } : {})
            }
          : undefined,
      }),
      providesTags: [{type: 'Booking' as const, id: 'LIST'}]
    }),

    // Check that the guest count fits the property. Body is `{ property_id, guests }`: the dates are a 422.
    // The answer is `occupancy_ok`. Overlapping bookings are not checked.
    checkAvailability: builder.query<BookingOccupancyResult, BookingOccupancyCheck>({
      query: (data) => ({
        url: '/bookings/check-availability',
        method: 'POST',
        body: data
      }),
      providesTags: (_result, _error, { property_id }) => [{ type: 'Property', id: property_id }],
    }),

    // Calculate booking pricing. A property with no rate or an invalid range is a 4xx error envelope, not a 200.
    calculatePricing: builder.query<BookingPricing, BookingAvailability>({
      query: (data) => ({
        url: '/bookings/calculate-pricing',
        method: 'POST',
        body: data
      }),
      providesTags: (_result, _error, { property_id }) => [{ type: 'Property', id: property_id }],
    }),

    // Get booking details. Staff get `BookingStaff` (adds internal_notes).
    getBooking: builder.query<BookingStaff, number>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Booking' as const, id: arg}]
    }),

    // Update booking details. `internal_notes` is staff only.
    updateBooking: builder.mutation<BookingStaff, { id: number; data: BookingUpdate }>({
      query: ({ id, data }) => ({
        url: `/bookings/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { id }) => [{ type: 'Booking', id }, { type: 'Booking', id: 'LIST' }]
    }),

    // Cancel a booking. `reason` is required: 1 to 1000 characters after trimming.
    cancelBooking: builder.mutation<Booking | BookingStaff, BookingCancel>({
      query: (body) => ({
        url: `/bookings/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (res, _e, { booking_id }) => [{ type: 'Booking', id: booking_id }, { type: 'Booking', id: 'LIST' }]
    }),

    // Record a manual payment (admin only). The caller enters the method and the transaction id: no defaults.
    processPayment: builder.mutation<Booking | BookingStaff, BookingPayment>({
      query: (body) => ({
        url: '/bookings/payment',
        method: 'POST',
        body,
      }),
      invalidatesTags: (res, _e, { booking_id }) => [{ type: 'Booking', id: booking_id }, { type: 'Booking', id: 'LIST' }]
    }),

    // Add a review. Only the booking guest may review (400 REVIEW_NOT_ALLOWED for anyone else).
    addReview: builder.mutation<Booking | BookingStaff, BookingReview>({
      query: (body) => ({
        url: '/bookings/review',
        method: 'POST',
        body,
      }),
      invalidatesTags: (res, _e, { booking_id }) => [{ type: 'Booking', id: booking_id }, { type: 'Booking', id: 'LIST' }, {type: 'Property', id: 'LIST'}]
    }),

    // Get all bookings (admin/agent view). Rows are `BookingStaff`.
    getAllBookings: builder.query<PaginatedResponse<BookingStaff>, BookingsQuery>({
      query: (params) => ({
        url: '/bookings/all',
        params: { limit: 20, ...params }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((b) => ({ type: 'Booking' as const, id: b.id })),
              { type: 'Booking' as const, id: 'LIST' },
            ]
          : [{ type: 'Booking' as const, id: 'LIST' }],
    }),

  }),
})

export const {
  useCreateBookingMutation,
  useGetUserBookingsQuery,
  useCheckAvailabilityQuery,
  useCalculatePricingQuery,
  useGetBookingQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  useProcessPaymentMutation,
  useAddReviewMutation,
  useGetAllBookingsQuery,
} = bookingsApi
