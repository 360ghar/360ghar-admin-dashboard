/**
 * Core API types.
 *
 * Every wire type is an alias of the generated OpenAPI components
 * (`src/lib/api/schema.gen.ts`, regenerate with `npm run api:sync && npm run api:types`).
 * Do not hand-write a type that the backend already declares. Only UI-only
 * shapes (filters, view models, the unauthenticated `/health` and `/config`
 * roots that OpenAPI does not describe) live here as hand-written types.
 */
import type { components, paths } from '@/lib/api/schema.gen'

type S = components['schemas']

/** Query keys of a GET operation, taken from the spec so an undeclared key fails the type check. */
export type QueryOf<P extends keyof paths> = paths[P] extends { get: { parameters: { query?: infer Q } } }
  ? NonNullable<Q>
  : never

// ---------------------------------------------------------------------------
// Enums (wire values exactly as the backend sends them)
// ---------------------------------------------------------------------------
export type PropertyPurpose = S['PropertyPurpose']
export type PropertyType = S['PropertyType']
export type PropertyStatus = S['PropertyStatus']
export type KitchenType = S['KitchenType']
export type VentilationType = S['VentilationType']
export type FurnishingLevel = S['FurnishingLevel']
export type VisitStatus = S['VisitStatus']
export type VisitContext = S['VisitContext']
export type BookingStatus = S['BookingStatus']
export type PaymentStatus = S['PaymentStatus']
export type AgentType = S['AgentType']
export type ExperienceLevel = S['ExperienceLevel']
export type UserRole = S['UserRole']
export type AuthMethod = S['AuthMethod']
export type AppKey = S['AppKey']
export type DevicePlatform = S['DevicePlatform']
export type BugType = S['BugType']
export type BugSeverity = S['BugSeverity']
export type BugStatus = S['BugStatus']
export type PageFormat = S['PageFormat']
export type ListingModerationStatus = S['ListingModerationStatus']
export type UserReportStatus = S['UserReportStatus']
export type UserReportReason = S['UserReportReason']

// ---------------------------------------------------------------------------
// Errors and pagination
// ---------------------------------------------------------------------------
/** Any non-2xx body: `{ error: { code, message, details } }`. */
export type ErrorEnvelope = S['ErrorEnvelope']
/** 422 body: the same envelope with `details.fields[{ field, msg, type }]`. */
export type ValidationErrorEnvelope = S['ValidationErrorEnvelope']
export type ValidationFieldError = S['ValidationFieldError']

/**
 * One CursorPage for every list: `{ items, next_cursor, has_more, limit, total }`.
 * `total` is null unless the request sent `include_total=true`.
 */
export type CursorPage<T> = Omit<S['CursorPage_Property_'], 'items'> & { items: T[] }
export type PaginatedResponse<T> = CursorPage<T>

/** The backend rejects `limit` above 100 with 422. */
export const MAX_PAGE_LIMIT = 100

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
/** A row of the admin user list and the admin user detail. */
export type AdminUser = S['AdminUser']
/** The signed-in user. The only user shape that carries `supabase_user_id`. */
export type SelfUser = S['SelfUser']
export type User = AdminUser
export type UserPreferences = S['UserPreferences']
export type UserPreferencesPatch = S['UserPreferencesPatch']
export type UserNotificationSettings = S['NotificationSettings']
export type UserNotificationSettingsWrite = S['NotificationSettingsWrite']
export type UserPrivacySettings = S['PrivacySettings']
export type UserPrivacySettingsPatch = S['PrivacySettingsPatch']
/** Self save (`PUT /users/profile`, `PUT /users/me`). */
export type UserUpdate = S['UserUpdate']
/** Admin save (`PUT /users/{id}`). The only write that accepts `is_active`. */
export type AdminUserUpdate = S['AdminUserUpdate']
export type UserLocation = S['UserLocation']
export type PublicUserRef = S['PublicUserRef']
export type UsersQuery = QueryOf<'/api/v1/users'>

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
export type Agent = S['Agent']
/** Embedded in `AdminUser.agent`: id, name, contact_number. */
export type AgentRef = S['AgentSummary']
export type AgentAvailabilityUpdate = S['AgentAvailabilityUpdate']
export type AgentAssignment = S['AgentAssignment']
export type AgentWithStats = S['AgentWithStats']
export type AgentPerformanceMetrics = S['AgentStats']
export type AgentCreate = S['AgentCreate']
export type AgentUpdate = S['AgentUpdate']
export type AgentWorkload = S['AgentWorkload']
export type AgentSystemStats = S['AgentSystemStats']
export type AgentsQuery = QueryOf<'/api/v1/agents'>

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------
export type Property = S['Property']
export type PropertyDetail = S['PropertyDetail']
export type PropertyImage = S['PropertyImage']
export type PropertyAmenity = S['PropertyAmenityResponse']
export type Amenity = S['Amenity']
export type PropertyCreate = S['PropertyCreate']
export type PropertyUpdate = S['PropertyUpdate']
export type PropertyQuery = QueryOf<'/api/v1/properties'>

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------
export type Visit = S['Visit']
export type VisitAgentInfo = S['VisitAgentInfo']
export type VisitCreate = S['VisitCreate']
export type VisitUpdate = S['VisitUpdate']
export type VisitComplete = S['VisitComplete']
export type VisitCancel = S['VisitCancel']
export type VisitReschedule = S['VisitReschedule']
export type VisitsQuery = QueryOf<'/api/v1/visits/all'>

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
/** Guest shape. Never carries `internal_notes`. */
export type Booking = S['Booking']
/** Staff shape (admin and agent views only). Adds `internal_notes`. */
export type BookingStaff = S['BookingStaff']
export type BookingPropertySummary = S['BookingPropertySummary']
export type BookingCreate = S['BookingCreate']
export type BookingUpdate = S['BookingUpdate']
export type BookingAvailability = S['BookingAvailability']
export type BookingOccupancyCheck = S['BookingOccupancyCheck']
export type BookingOccupancyResult = S['BookingOccupancyResult']
export type BookingPricing = S['BookingPricing']
export type BookingPayment = S['BookingPayment']
export type BookingReview = S['BookingReview']
export type BookingCancel = S['BookingCancel']
export type BookingsQuery = QueryOf<'/api/v1/bookings/all'>

// ---------------------------------------------------------------------------
// Core system: bug reports, pages, app versions, uploads
// ---------------------------------------------------------------------------
export type BugReport = S['BugReportResponse']
export type BugReportCreate = S['BugReportCreate']
export type BugReportUpdate = S['BugReportUpdate']
export type BugReportsQuery = QueryOf<'/api/v1/bugs'>

export type Page = S['PageResponse']
export type PageCreate = S['PageCreate']
export type PageUpdate = S['PageUpdate']
export type PagesQuery = QueryOf<'/api/v1/pages'>

export type AppUpdate = S['AppVersionResponse']
export type AppUpdateCreate = S['AppVersionCreate']
export type AppUpdateUpdate = S['AppVersionUpdate']
export type AppUpdatesQuery = QueryOf<'/api/v1/versions'>

export type UploadResponse = S['UploadResult']

/**
 * `GET /health` is a root route that OpenAPI does not describe. Shape from
 * `app/main.py`: status, startup_degraded, timestamp, version.
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded'
  startup_degraded: boolean
  timestamp: string
  version: string
}

// ---------------------------------------------------------------------------
// Flatmates moderation
// ---------------------------------------------------------------------------
export type FlatmatesListing = S['FlatmateListingAdmin']
export type FlatmatesReport = S['FlatmateReportAdmin']
export type FlatmateAdminUser = S['FlatmateAdminUser']
export type ModerationAction = S['ListingModerationAction']
export type ReportModerationAction = S['ReportModerationAction']

export type ModerationQueueResponse = CursorPage<FlatmatesListing>
export type ReportsQueueResponse = CursorPage<FlatmatesReport>

// ---------------------------------------------------------------------------
// Swipes
// ---------------------------------------------------------------------------
/** Result of `POST /swipes`. The backend never returns a match flag. */
export type SwipeResult = S['SwipeOut']
/** `GET /swipes` returns the properties the caller liked or passed, not swipe rows. */
export type SwipeListResponse = CursorPage<Property>
