import { api } from '@/store/api'
import type {
  Booking,
  BookingCreate,
  BookingUpdate,
  BookingAvailability,
  AvailabilityInfo,
  BookingPricing,
  BookingPayment,
  BookingReview,
  PaginatedResponse,
} from '@/types/api'

export interface BookingsQuery {
  cursor?: string | null
  limit?: number
  status?: string
  agent_id?: number
  property_id?: number
  user_id?: number
  q?: string
  payment_status?: string
  include_total?: boolean
}

export interface BookingsCursorQuery {
  cursor?: string | null
  limit?: number
  include_total?: boolean
  status?: string
}

export const bookingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Create a booking
    createBooking: builder.mutation<Booking, BookingCreate>({
      query: (data) => ({
        url: '/bookings',
        method: 'POST',
        body: data
      }),
      invalidatesTags: [{type: 'Booking', id: 'LIST'}, {type: 'Property', id: 'LIST'}]
    }),

    // Get current user's bookings
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

    // Check booking availability
    checkAvailability: builder.query<AvailabilityInfo, BookingAvailability>({
      query: (data) => ({
        url: '/bookings/check-availability',
        method: 'POST',
        body: data
      })
    }),

    // Calculate booking pricing
    calculatePricing: builder.query<BookingPricing, BookingAvailability>({
      query: (data) => ({
        url: '/bookings/calculate-pricing',
        method: 'POST',
        body: data
      })
    }),

    // Get booking details
    getBooking: builder.query<Booking, number>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_result, _error, arg) => [{type: 'Booking' as const, id: arg}]
    }),

    // Update booking details
    updateBooking: builder.mutation<Booking, { id: number; data: BookingUpdate }>({
      query: ({ id, data }) => ({
        url: `/bookings/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res, _e, { id }) => [{ type: 'Booking', id }, { type: 'Booking', id: 'LIST' }]
    }),

    // Cancel a booking
    cancelBooking: builder.mutation<void, { bookingId: number; reason: string }>({
      query: ({ bookingId, reason }) => ({
        url: `/bookings/cancel`,
        method: 'POST',
        body: {
          booking_id: bookingId,
          reason,
        }
      }),
      invalidatesTags: (res, _e, { bookingId }) => [{ type: 'Booking', id: bookingId }, { type: 'Booking', id: 'LIST' }]
    }),

    // Process payment for booking
    processPayment: builder.mutation<void, { bookingId: number; paymentData: BookingPayment }>({
      query: ({ bookingId, paymentData }) => ({
        url: '/bookings/payment',
        method: 'POST',
        body: {
          booking_id: bookingId,
          ...paymentData,
        }
      }),
      invalidatesTags: (res, _e, { bookingId }) => [{ type: 'Booking', id: bookingId }, { type: 'Booking', id: 'LIST' }]
    }),

    // Add review to booking
    addReview: builder.mutation<void, { bookingId: number; reviewData: BookingReview }>({
      query: ({ bookingId, reviewData }) => {
        return {
          url: '/bookings/review',
          method: 'POST',
          body: {
            booking_id: bookingId,
            guest_rating: reviewData.guest_rating,
            guest_review: reviewData.guest_review,
          }
        }
      },
      invalidatesTags: (res, _e, { bookingId }) => [{ type: 'Booking', id: bookingId }, { type: 'Booking', id: 'LIST' }, {type: 'Property', id: 'LIST'}]
    }),

    // Get all bookings (admin/agent view)
    getAllBookings: builder.query<PaginatedResponse<Booking>, BookingsQuery>({
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
      extraOptions: { refetchOnFocus: true },
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
