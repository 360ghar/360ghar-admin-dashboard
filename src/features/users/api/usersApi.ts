import { api } from '@/store/api'
import type {
  AdminUser,
  AdminUserUpdate,
  SelfUser,
  UserLocation,
  UserPreferences,
  UserPreferencesPatch,
  UserPrivacySettings,
  UserPrivacySettingsPatch,
  UserUpdate,
  UsersQuery,
  PaginatedResponse,
} from '@/types'
import type { components } from '@/lib/api/schema.gen'

// Re-export types for existing imports
export type { UserPreferences, UserUpdate, UsersQuery, PaginatedResponse }

/** Body of `POST /notifications/send/typed/user`. `type_key` is a registered key (an unknown key is a 422). */
export type TypedUserNotificationBody = components['schemas']['TypedUserNotification']
export type NotificationDispatchResult = components['schemas']['NotificationDispatchResult']

export interface TypedUserNotificationPayload {
  userId: number
  typeKey: TypedUserNotificationBody['type_key']
  title: string
  body: string
  data?: Record<string, string>
  /** Push route (for example `/property/123`). The backend delivers it as `data.route`. */
  deep_link?: string
}

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // List users with cursor pagination and search
    getUsers: builder.query<PaginatedResponse<AdminUser>, UsersQuery>({
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
    getUser: builder.query<AdminUser, number>({
      query: (id) => `/users/${id}`,
      providesTags: (res, _e, id) => [{ type: 'User', id }],
    }),

    // Admin update of another user. Only this write accepts `is_active` (admin only; an agent gets 403).
    updateUser: builder.mutation<AdminUser, { id: number; data: AdminUserUpdate }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (_res, _e, { id }) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),

    // Assign agent to user. Returns the updated user.
    assignAgent: builder.mutation<AdminUser, { userId: number; agentId: number }>({
      query: ({ userId, agentId }) => ({
        url: `/users/${userId}/assign-agent`,
        method: 'POST',
        body: { agent_id: agentId }
      }),
      invalidatesTags: (_res, _e, { userId }) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
        // The old agent also loses one assignment; its detail/stats need refresh.
        { type: 'Agent' },
      ],
    }),

    // Get current user's profile
    getProfile: builder.query<SelfUser, void>({
      query: () => '/users/profile',
      providesTags: (res) => res
        ? [{ type: 'User' as const, id: 'PROFILE' }, { type: 'User' as const, id: res.id }]
        : [{ type: 'User' as const, id: 'PROFILE' }],
    }),

    // Update current user's profile. Self save: no email, bio, preferences or profile_image_url.
    updateProfile: builder.mutation<SelfUser, UserUpdate>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (res) => res
        ? [{ type: 'User', id: res.id }, { type: 'User', id: 'PROFILE' }, { type: 'User', id: 'LIST' }]
        : [{ type: 'User', id: 'PROFILE' }, { type: 'User', id: 'LIST' }],
    }),

    // Replace the signed-in user's avatar. `profile_image_url` is not a profile field any more.
    uploadAvatar: builder.mutation<SelfUser, FormData>({
      query: (formData) => ({
        url: '/users/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (res) => res
        ? [{ type: 'User', id: res.id }, { type: 'User', id: 'PROFILE' }, { type: 'User', id: 'LIST' }]
        : [{ type: 'User', id: 'PROFILE' }, { type: 'User', id: 'LIST' }],
    }),

    // Update user preferences (the single writer of preferences). Unsent keys are kept; null removes a key.
    updatePreferences: builder.mutation<UserPreferences, UserPreferencesPatch>({
      query: (data) => ({
        url: '/users/preferences',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: [{type: 'User', id: 'LIST'}, {type: 'User', id: 'PROFILE'}],
    }),

    // Update user location
    updateLocation: builder.mutation<UserLocation, { latitude: number; longitude: number }>({
      query: (data) => ({
        url: '/users/location',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: [{type: 'User', id: 'LIST'}, {type: 'User', id: 'PROFILE'}],
    }),

    // Privacy settings. Partial merge: send only the keys that changed.
    updatePrivacySettings: builder.mutation<UserPrivacySettings, UserPrivacySettingsPatch>({
      query: (data) => ({
        url: '/users/privacy-settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [{type: 'User', id: 'PROFILE'}],
    }),

    // Send a typed notification to a user (multi-channel, backend-controlled)
    sendTypedNotification: builder.mutation<NotificationDispatchResult, TypedUserNotificationPayload>({
      query: ({ userId, typeKey, title, body, data, deep_link }) => {
        const payload: TypedUserNotificationBody = {
          user_id: userId,
          type_key: typeKey,
          title,
          body,
          data,
          deep_link,
        }
        return { url: '/notifications/send/typed/user', method: 'POST', body: payload }
      },
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
  useUploadAvatarMutation,
  useUpdatePreferencesMutation,
  useUpdateLocationMutation,
  useUpdatePrivacySettingsMutation,
  useSendTypedNotificationMutation,
} = usersApi
