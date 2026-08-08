// Core Types

export type PropertyPurpose = 'buy' | 'rent' | 'short_stay'
export type PropertyType =
  | 'house'
  | 'apartment'
  | 'builder_floor'
  | 'room'
  | 'villa'
  | 'plot'
  | 'condo'
  | 'penthouse'
  | 'studio'
  | 'loft'
  | 'pg'
  | 'flatmate'
  | 'office'
  | 'shop'
  | 'warehouse'
export type PropertyStatus = 'available' | 'sold' | 'rented' | 'under_offer' | 'maintenance'
export type KitchenType = 'vegetarian' | 'non_vegetarian' | 'eggetarian' | 'any'
export type VentilationType = 'good' | 'average' | 'poor'
export type FurnishingLevel = 'furnished' | 'semi_furnished' | 'unfurnished'

export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Uniform cursor-paginated response shape returned by every backend list endpoint.
 * `next_cursor` is an opaque base64 token (null on the terminal page); `has_more`
 * is the authoritative end-of-list signal. When the query includes
 * `include_total: true`, the backend also returns `total` as an integer.
 */
export interface PaginatedResponse<T> {
  items: T[]
  next_cursor: string | null
  has_more: boolean
  limit: number
  total?: number
}

// User Types
export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  role: 'user' | 'agent' | 'admin'
  is_active: boolean
  is_verified: boolean
  email_verified?: boolean
  phone_verified?: boolean
  last_auth_method?: 'google' | 'email_password' | 'phone_password' | 'phone_otp' | 'email_otp' | null
  supabase_user_id: string
  agent_id?: number
  agent?: Agent
  created_at: string
  updated_at: string
  profile_image_url?: string
  date_of_birth?: string
  current_latitude?: number
  current_longitude?: number
  preferred_locations?: string[]
  notification_settings?: UserNotificationSettings
  privacy_settings?: UserPrivacySettings
  preferences?: UserPreferences
  flatmates_smoking?: 'never' | 'occasionally' | 'regularly'
  flatmates_drinking?: 'never' | 'occasionally' | 'regularly'
  native_place?: string
  linkedin_url?: string
  age_bucket?: string
}

export interface UserPreferences {
  [key: string]: unknown
  property_type?: string[]
  purpose?: 'buy' | 'rent' | 'short_stay'
  budget_min?: number
  budget_max?: number
  bedrooms_min?: number
  bedrooms_max?: number
  area_min?: number
  area_max?: number
  location_preference?: string[]
  max_distance_km?: number
}

export interface UserNotificationSettings {
  email_notifications?: boolean
  push_notifications?: boolean
  sms_notifications?: boolean
  visit_reminders?: boolean
  booking_updates?: boolean
  price_alerts?: boolean
  new_properties?: boolean
  property_updates?: boolean
  promotional_emails?: boolean
  onboarding?: boolean
  digest?: boolean
  frequency?: string
  quietHours?: {
    start: string
    end: string
  }
  quiet_hours?: {
    start: string
    end: string
  }
  categories?: Record<string, boolean>
}

export interface UserPrivacySettings {
  profile_visibility: 'public' | 'agents_only' | 'private'
  show_phone: boolean
  show_email: boolean
  allow_location_tracking: boolean
  data_sharing_consent: boolean
  location_sharing?: boolean
  contact_sharing?: boolean
  search_history_tracking?: boolean
}

export interface UserUpdate {
  email?: string
  full_name?: string
  phone?: string
  date_of_birth?: string
  profile_image_url?: string
  preferences?: UserPreferences
  current_latitude?: number
  current_longitude?: number
  preferred_locations?: string[]
  notification_settings?: UserNotificationSettings
  privacy_settings?: UserPrivacySettings
}

// Agent Types
export interface Agent {
  id: number
  name: string
  contact_number?: string
  description?: string
  avatar_url?: string
  languages?: string[]
  agent_type: 'general' | 'specialist' | 'senior'
  experience_level: 'beginner' | 'intermediate' | 'expert'
  working_hours?: Record<string, unknown>
  total_users_assigned: number
  user_satisfaction_rating: number
  is_active: boolean
  is_available: boolean
  created_at: string
  updated_at?: string
  user?: User
}

export interface WorkingHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

export interface AgentPerformanceMetrics {
  total_users_assigned: number
  user_satisfaction_rating: number
  active_conversations: number
  daily_interactions: number
  weekly_interactions: number
  efficiency_score: number
}

export interface AgentCreate {
  name: string
  contact_number?: string
  description?: string
  avatar_url?: string
  languages?: string[]
  agent_type: 'general' | 'specialist' | 'senior'
  experience_level?: 'beginner' | 'intermediate' | 'expert'
  working_hours?: Record<string, unknown>
}

export interface AgentWorkload {
  agent_id: number
  agent_name: string
  current_users: number
  utilization_percentage: number
  is_available: boolean
  queue_length: number
}

export interface AgentSystemStats {
  total_agents: number
  active_agents: number
  active_users?: number
  properties_listed?: number
  occupancy_rate?: number
  total_users_served: number
  system_satisfaction_score: number
  agents_by_type: Record<string, number>
  load_distribution: AgentWorkload[]
  [key: string]: number | string | Record<string, number> | AgentWorkload[] | undefined
}

export interface AgentWithStats extends Agent {
  stats: AgentPerformanceMetrics
}

// Property Types
export interface Property {
  id: number
  title: string
  description?: string
  property_type: PropertyType
  purpose: PropertyPurpose
  base_price: number
  latitude?: number
  longitude?: number
  city?: string
  locality?: string
  pincode?: string
  area_sqft?: number
  bedrooms?: number
  bathrooms: number
  balconies?: number
  parking_spaces?: number
  floor_number?: number
  total_floors?: number
  age_of_property?: number
  max_occupancy?: number
  minimum_stay_days?: number
  monthly_rent?: number
  daily_rate?: number
  kitchen_type?: KitchenType
  ventilation_type?: VentilationType
  windows_count?: number
  ventilation_shafts?: number
  setup_cost?: number
  other_charges?: number
  other_charges_description?: string
  furnishing_level?: FurnishingLevel
  amenities: Amenity[]
  features: string[]
  images: PropertyImage[]
  main_image_url?: string
  owner_id: number
  owner_name?: string
  owner_contact?: string
  status: PropertyStatus
  liked?: boolean
  user_has_scheduled_visit?: boolean
  user_scheduled_visit_count?: number
  user_next_visit_date?: string
  distance_km?: number
  created_at: string
  updated_at?: string
}

export interface PropertyImage {
  id: number
  property_id: number
  image_url: string
  caption?: string
  image_category: string
  display_order?: number
  is_main_image: boolean
}

export interface Amenity {
  id: number
  title: string
  name?: string
  category?: string
  icon?: string
  is_active?: boolean
}

export interface PropertyCreate {
  title: string
  description?: string
  property_type: string
  purpose: string
  base_price: number
  latitude?: number
  longitude?: number
  city: string
  locality: string
  pincode?: string
  area_sqft?: number
  bedrooms?: number
  bathrooms?: number
  balconies?: number
  parking_spaces?: number
  floor_number?: number
  total_floors?: number
  age_of_property?: number
  max_occupancy?: number
  minimum_stay_days?: number
  amenity_ids?: number[]
  features?: string[]
  main_image_url?: string
  owner_name?: string
  owner_contact?: string
  monthly_rent?: number
  daily_rate?: number
  kitchen_type?: KitchenType
  ventilation_type?: VentilationType
  windows_count?: number
  ventilation_shafts?: number
  setup_cost?: number
  other_charges?: number
  other_charges_description?: string
  furnishing_level?: FurnishingLevel
}

export interface PropertyUpdate extends Partial<PropertyCreate> {
  status?: PropertyStatus
  is_available?: boolean
}

// Visit Types — wire values match backend VisitStatus enum
export type VisitStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'reschedule_suggested'

export interface Visit {
  id: number
  property_id: number
  user_id: number
  agent_id?: number
  scheduled_date: string
  status: VisitStatus
  special_requirements?: string
  visit_notes?: string
  visitor_feedback?: string
  completed_at?: string
  created_at: string
  updated_at: string
  property?: Property
  user?: User
  agent?: Agent
}

export interface VisitCreate {
  property_id: number
  user_id?: number
  scheduled_date: string
  special_requirements?: string
}

export interface VisitUpdate {
  scheduled_date?: string
  status?: VisitStatus
  special_requirements?: string
  visit_notes?: string
  visitor_feedback?: string
}

/** Body for POST /visits/{id}/complete (backend VisitComplete schema). */
export interface VisitComplete {
  notes?: string
  feedback?: string
}

// Visit list endpoints now return the uniform cursor-paginated shape
// (PaginatedResponse<Visit>). The legacy aggregate VisitList wrapper has been
// removed alongside the backend's `total`/`upcoming`/`completed` fields.

// Booking Types
export interface Booking {
  id: number
  property_id: number
  user_id: number
  booking_reference: string
  check_in_date: string
  check_out_date: string
  guests: number
  primary_guest_name: string
  primary_guest_phone: string
  primary_guest_email: string
  special_requests?: string
  guest_details?: Record<string, unknown>
  nights: number
  base_amount: number
  taxes_amount: number
  service_charges: number
  discount_amount: number
  total_amount: number
  booking_status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed'
  payment_method?: string
  transaction_id?: string
  payment_date?: string
  cancellation_date?: string
  cancellation_reason?: string
  guest_rating?: number
  guest_review?: string
  host_rating?: number
  host_review?: string
  review?: BookingReview
  created_at: string
  updated_at?: string
  property?: Property
  user?: User
}

export interface BookingCreate {
  property_id: number
  check_in_date: string
  check_out_date: string
  guests: number
  primary_guest_name: string
  primary_guest_phone: string
  primary_guest_email: string
  special_requests?: string
  guest_details?: Record<string, unknown>
}

export interface BookingUpdate {
  guests?: number
  primary_guest_name?: string
  primary_guest_phone?: string
  primary_guest_email?: string
  special_requests?: string
  guest_details?: Record<string, unknown>
}

export interface BookingAvailability {
  property_id: number
  check_in_date: string
  check_out_date: string
  guests: number
}

export interface AvailabilityInfo {
  available: boolean
  reason?: string
  max_occupancy?: number
}

export interface BookingPricing {
  property_id: number
  check_in_date: string
  check_out_date: string
  guests: number
  nights: number
  base_amount: number
  taxes_amount: number
  service_charges: number
  discount_amount: number
  total_amount: number
  breakdown?: Record<string, number>
}

export interface PricingBreakdown {
  label: string
  amount: number
  type: 'base' | 'tax' | 'fee' | 'discount'
}

export interface BookingPayment {
  payment_method: string
  transaction_id: string
  amount: number
}

export interface BookingReview {
  guest_rating: number
  guest_review?: string
}

// Booking list endpoints now return the uniform cursor-paginated shape
// (PaginatedResponse<Booking>). The legacy aggregate BookingList wrapper has
// been removed alongside the backend's `total`/`upcoming`/`completed` fields.

// Core System Types
export interface BugReport {
  id: number
  user_id?: number | null
  source: 'web' | 'mobile' | 'api'
  bug_type: 'ui_bug' | 'functionality_bug' | 'performance_issue' | 'crash' | 'feature_request' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  device_info?: DeviceInfo
  app_version?: string
  media_urls?: string[]
  tags?: string[]
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: number
  resolution?: string
  created_at: string
  updated_at?: string
  resolved_at?: string
}

export interface DeviceInfo {
  os?: string
  version?: string
  model?: string
  browser?: string
  screen_resolution?: string
}

export interface BugReportCreate {
  source: 'web' | 'mobile' | 'api'
  bug_type: 'ui_bug' | 'functionality_bug' | 'performance_issue' | 'crash' | 'feature_request' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  device_info?: DeviceInfo
  app_version?: string
  tags?: string[]
}

export interface BugReportUpdate {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: number
  resolution?: string
  tags?: string[]
}

export interface BugReportsQuery {
  status?: string
  bug_type?: string
  limit?: number
  cursor?: string | null
  include_total?: boolean
}

// Pages Types
export interface Page {
  unique_name: string
  title: string
  content: string
  format: 'html' | 'markdown'
  custom_config?: Record<string, unknown>
  is_active: boolean
  is_draft: boolean
  created_at: string
  updated_at: string
}

export interface PageCreate {
  unique_name: string
  title: string
  content: string
  format?: 'html' | 'markdown'
  custom_config?: Record<string, unknown>
  is_active?: boolean
  is_draft?: boolean
}

export interface PageUpdate {
  title?: string
  content?: string
  format?: 'html' | 'markdown'
  custom_config?: Record<string, unknown>
  is_active?: boolean
  is_draft?: boolean
}

export interface PagePublicResponse {
  unique_name: string
  title: string
  content: string
  format: 'html' | 'markdown'
  updated_at: string
}

export interface PagesQuery {
  is_active?: boolean
  is_draft?: boolean
  limit?: number
  cursor?: string | null
}

// App Updates Types
export interface AppUpdate {
  id: number
  app?: string
  platform: 'ios' | 'android' | 'web'
  version: string
  build_number: number
  release_notes: string
  download_url: string
  is_mandatory: boolean
  is_active: boolean
  min_supported_version: string
  created_at: string
  updated_at: string
}

export interface AppUpdateCreate {
  app?: string
  platform: 'ios' | 'android' | 'web'
  version: string
  build_number: number
  release_notes: string
  download_url: string
  is_mandatory?: boolean
  is_active?: boolean
  min_supported_version?: string
}

export interface AppUpdateUpdate {
  app?: string
  version?: string
  build_number?: number
  release_notes?: string
  download_url?: string
  is_mandatory?: boolean
  is_active?: boolean
  min_supported_version?: string
}

export interface AppUpdateCheckRequest {
  app?: string
  platform: 'ios' | 'android' | 'web'
  current_version: string
  build_number: number
}

export interface AppUpdateCheckResponse {
  update_available: boolean
  is_mandatory: boolean
  latest_version: string
  download_url: string
  release_notes: string
  min_supported_version: string
}

export interface AppUpdatesQuery {
  app?: string
  platform?: string
  is_active?: boolean
  limit?: number
  cursor?: string | null
}

// Health Check
export interface HealthResponse {
  status: 'healthy' | 'degraded'
  database: string
  database_url?: string
  timestamp: string
  version: string
}

// App Configuration (non-sensitive)
export interface AppConfig {
  api_version: string
  environment: string
  database: string
  auth: string
  features: string[]
}

// Upload Types
export interface UploadResponse {
  file_path: string
  public_url: string
  filename: string
  content_type: string
  size: number
}

// API Query Types
export interface UsersQuery {
  cursor?: string | null
  limit?: number
  q?: string
  agent_id?: number
}

// Flatmates Moderation Types
export interface FlatmatesPrescreenFlag {
  code: string
  severity: 'warning' | 'high'
  reason: string
  field?: string
  matched_term?: string
}

export interface FlatmatesListing {
  id: number
  owner_id: number
  title: string
  description?: string
  city?: string
  locality?: string
  sub_locality?: string
  monthly_rent?: number
  security_deposit?: number
  maintenance_charges?: number
  area_sqft?: number
  bedrooms?: number
  bathrooms?: number
  features?: string[]
  tags?: string[]
  main_image_url?: string
  image_urls?: string[]
  status: 'pending_review' | 'live' | 'rejected' | 'paused' | 'expired'
  created_at: string
  updated_at: string
  available_from?: string
  gender_preference?: string
  sharing_type?: string
  listing_preferences?: Record<string, unknown>
  ai_prescreen_result?: 'clear' | 'flagged' | 'pending'
  ai_prescreen_flags?: FlatmatesPrescreenFlag[]
  ai_flag_reason?: string
  property_status?: string
  is_available?: boolean
  owner?: User
}

export interface FlatmatesReport {
  id: number
  reporter_user_id: number
  reported_user_id: number
  reason: 'spam' | 'fake_profile' | 'abuse' | 'inappropriate' | 'other'
  description?: string
  status: 'open' | 'reviewed' | 'dismissed' | 'actioned'
  conversation_id?: number
  property_id?: number
  created_at: string
  updated_at: string
  admin_notes?: string
  moderated_by?: number
  reporter?: User
  reported_user?: User
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'request_edit'
  reason?: string
}

export interface ReportModerationAction {
  action: 'dismiss' | 'warn_user' | 'suspend_user' | 'escalate'
  notes?: string
}

export type ModerationQueueResponse = PaginatedResponse<FlatmatesListing>

export type ReportsQueueResponse = PaginatedResponse<FlatmatesReport>

// Swipe Types
export interface Swipe {
  id: number
  user_id: number
  property_id: number
  is_liked: boolean
  created_at: string
  property?: Property
}

export type SwipeListResponse = PaginatedResponse<Swipe>
