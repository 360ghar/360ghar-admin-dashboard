import { api } from '@/store/api'
import type {
  User,
  UserNotificationSettings,
  UserPrivacySettings,
  UserPreferences,
  UserUpdate,
  UsersQuery,
  PaginatedResponse,
} from '@/types'

// Re-export types for backward compatibility with existing imports
export type { UserPreferences, UserUpdate, UsersQuery, PaginatedResponse }

export interface TypedUserNotificationPayload {
  userId: number
  typeKey: string
  title: string
  body: string
  data?: Record<string, string>
  deep_link?: string
}

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // List users with cursor pagination and search
    getUsers: builder.query<PaginatedResponse<User>, UsersQuery>({
      query: (params) => ({
        url: '/users',
        params: { limit: 20, ...params }
      }),
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((u) => ({ type: 'User' as const, id: u.id })),
              { type: 'User' as const, id: 'LIST' },
            ]
          : [{ type: 'User' as const, id: 'LIST' }],
    }),

    // Get user details
    getUser: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (res, _e, id) => [{ type: 'User', id }],
    }),

    // Update user
    updateUser: builder.mutation<User, { id: number; data: Partial<UserUpdate> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),

    // Assign agent to user
    assignAgent: builder.mutation<void, { userId: number; agentId: number }>({
      query: ({ userId, agentId }) => ({
        url: `/users/${userId}/assign-agent`,
        method: 'POST',
        body: { agent_id: agentId }
      }),
      invalidatesTags: (_res, _e, { userId, agentId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
        { type: 'Agent', id: agentId },
        { type: 'Agent', id: 'LIST' },
      ],
    }),

    // Get current user's profile
    getProfile: builder.query<User, void>({
      query: () => '/users/profile',
      providesTags: [{type: 'User' as const, id: 'PROFILE'}],
    }),

    // Update current user's profile
    updateProfile: builder.mutation<User, Partial<UserUpdate>>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: [{type: 'User', id: 'PROFILE'}, {type: 'User', id: 'LIST'}],
    }),

    // Update user preferences
    updatePreferences: builder.mutation<void, UserPreferences>({
      query: (data) => ({
        url: '/users/preferences',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: [{type: 'User', id: 'LIST'}, {type: 'User', id: 'PROFILE'}],
    }),

    // Update user location
    updateLocation: builder.mutation<void, { latitude: number; longitude: number }>({
      query: (data) => ({
        url: '/users/location',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: [{type: 'User', id: 'LIST'}, {type: 'User', id: 'PROFILE'}],
    }),

    // Notification settings
    getNotificationSettings: builder.query<UserNotificationSettings, void>({
      query: () => '/users/notification-settings',
      providesTags: [{type: 'User', id: 'NOTIFICATION_SETTINGS'}],
    }),

    updateNotificationSettings: builder.mutation<void, UserNotificationSettings>({
      query: (data) => ({
        url: '/users/notification-settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{type: 'User', id: 'NOTIFICATION_SETTINGS'}],
    }),

    updateNotificationsCompat: builder.mutation<void, Record<string, unknown>>({
      query: (data) => ({
        url: '/users/notifications',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{type: 'User', id: 'NOTIFICATION_SETTINGS'}],
    }),

    // Privacy settings
    getPrivacySettings: builder.query<UserPrivacySettings, void>({
      query: () => '/users/privacy-settings',
      providesTags: [{type: 'User', id: 'PRIVACY_SETTINGS'}],
    }),

    updatePrivacySettings: builder.mutation<void, UserPrivacySettings>({
      query: (data) => ({
        url: '/users/privacy-settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{type: 'User', id: 'PRIVACY_SETTINGS'}],
    }),

    updatePrivacyCompat: builder.mutation<void, Record<string, unknown>>({
      query: (data) => ({
        url: '/users/privacy',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{type: 'User', id: 'PRIVACY_SETTINGS'}],
    }),

    // Send a typed notification to a user (multi-channel, backend-controlled)
    sendTypedNotification: builder.mutation<void, TypedUserNotificationPayload>({
      query: ({ userId, typeKey, title, body, data, deep_link }) => ({
        url: '/notifications/send/typed/user',
        method: 'POST',
        body: {
          user_id: userId,
          type_key: typeKey,
          title,
          body,
          data,
          deep_link,
        },
      }),
      invalidatesTags: [{type: 'Notification', id: 'LIST'}],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useAssignAgentMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useUpdateLocationMutation,
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useUpdateNotificationsCompatMutation,
  useGetPrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
  useUpdatePrivacyCompatMutation,
  useSendTypedNotificationMutation,
} = usersApi
