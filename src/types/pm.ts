export type ManagedPropertyStatus = 'draft' | 'active' | 'archived'

export interface PmSettings {
  payment_due_day: number
  grace_period_days: number
  late_fee_enabled: boolean
  late_fee_flat?: number | null
  late_fee_percent?: number | null
  auto_generate_charges: boolean
  notify_owner_on_payment: boolean
  notify_tenant_on_charge: boolean
  default_lease_term_months: number
}

export type PmSettingsUpdate = Partial<PmSettings>

export type TenantStatus = 'applicant' | 'approved' | 'active' | 'notice_period' | 'vacated' | 'rejected'

export type LeaseStatus =
  | 'draft'
  | 'pending_signature'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'renewed'

export type RentChargeStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived'

export type ExpenseCategory =
  | 'maintenance'
  | 'repairs'
  | 'insurance'
  | 'property_tax'
  | 'hoa'
  | 'utilities'
  | 'marketing'
  | 'legal'
  | 'other'

export type MaintenanceUrgency = 'emergency' | 'high' | 'medium' | 'low'

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'pest_control'
  | 'cleaning'
  | 'other'

export type MaintenanceRequestStatus = 'open' | 'in_review' | 'work_order_created' | 'resolved' | 'closed'

export type WorkOrderStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'closed' | 'cancelled'

export type DocumentType =
  | 'lease_agreement'
  | 'id_proof'
  | 'address_proof'
  | 'income_proof'
  | 'inspection_report'
  | 'receipt'
  | 'invoice'
  | 'property_deed'
  | 'insurance_policy'
  | 'other'

export type InspectionType = 'move_in' | 'move_out' | 'routine'

export interface DashboardOverview {
  total_properties: number
  occupied_properties: number
  vacant_properties: number
  under_maintenance_properties: number
  monthly_revenue_current: number
  monthly_revenue_previous: number
  outstanding_rent_total: number
  upcoming_expenses_total: number
}

export interface ActivityItem {
  type: string
  at: string
  id?: number | null
  property_id?: number | null
  lease_id?: number | null
  amount?: number | null
  status?: string | null
}

// Property status/purpose/type live in `types/api.ts` (single source of truth).
// Imported here for local use and re-exported so existing PM imports keep working.
import type { PropertyPurpose, PropertyType, PropertyStatus } from './api'
export type { PropertyPurpose, PropertyType, PropertyStatus } from './api'

export interface PmPropertyImage {
  id: number
  property_id: number
  image_url: string
  caption?: string | null
  image_category?: string | null
  display_order?: number | null
  is_main_image?: boolean | null
}

export interface PmPropertyAmenity {
  id: number
  amenity_id: number
  title?: string | null
  icon?: string | null
  category?: string | null
  is_active?: boolean | null
}

export interface PmProperty {
  id: number
  title: string
  description?: string | null
  property_type: PropertyType
  purpose: PropertyPurpose
  status: PropertyStatus

  latitude?: number | null
  longitude?: number | null
  city?: string | null
  state?: string | null
  country?: string | null
  pincode?: string | null
  locality?: string | null
  sub_locality?: string | null
  landmark?: string | null
  full_address?: string | null

  base_price: number
  monthly_rent?: number | null
  security_deposit?: number | null
  maintenance_charges?: number | null

  area_sqft?: number | null
  bedrooms?: number | null
  bathrooms?: number | null

  owner_id: number
  owner_name?: string | null
  owner_contact?: string | null

  is_managed: boolean
  management_status?: ManagedPropertyStatus | null
  payment_due_day?: number | null
  grace_period_days?: number | null
  late_fee_policy?: Record<string, unknown> | null
  current_lease_id?: number | null
  current_tenant_id?: number | null

  images?: PmPropertyImage[] | null
  amenities?: PmPropertyAmenity[] | null

  created_at: string
  updated_at?: string | null
}

export interface PmPropertyCreate {
  title: string
  description?: string
  property_type: PropertyType
  purpose: PropertyPurpose
  base_price: number
  latitude?: number
  longitude?: number
  city?: string
  state?: string
  country?: string
  pincode?: string
  locality?: string
  sub_locality?: string
  landmark?: string
  full_address?: string
  area_type?: string
  area_sqft?: number
  bedrooms?: number
  bathrooms?: number
  balconies?: number
  parking_spaces?: number
  video_urls?: string[]
  google_street_view_url?: string
  floor_plan_url?: string
  video_tour_url?: string
  price_per_sqft?: number
  monthly_rent?: number
  daily_rate?: number
  security_deposit?: number
  maintenance_charges?: number
  floor_number?: number
  total_floors?: number
  age_of_property?: number
  max_occupancy?: number
  minimum_stay_days?: number
  amenity_ids?: number[]
  features?: string[]
  main_image_url?: string
  virtual_tour_url?: string
  available_from?: string
  calendar_data?: Record<string, unknown>
  tags?: string[]
  owner_name?: string
  owner_contact?: string
  builder_name?: string
  search_keywords?: string
}

export interface ManagedPropertyUpdate {
  management_status?: ManagedPropertyStatus | null
  payment_due_day?: number | null
  grace_period_days?: number | null
  late_fee_policy?: Record<string, unknown> | null
}

export interface Lease {
  id: number
  property_id: number
  owner_id: number
  tenant_user_id?: number | null
  tenant_name?: string | null
  tenant_phone?: string | null
  tenant_email?: string | null
  status: LeaseStatus
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  late_fee_amount?: number | null
  late_fee_percentage?: number | null
  grace_period_days: number
  payment_due_day: number
  lease_terms?: Record<string, unknown> | null
  special_clauses?: string | null
  signed_by_tenant_at?: string | null
  signed_by_owner_at?: string | null
  lease_document_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface LeaseCreate {
  owner_id?: number | null
  property_id: number
  tenant_user_id?: number | null
  tenant_name?: string | null
  tenant_phone?: string | null
  tenant_email?: string | null
  status?: LeaseStatus
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  late_fee_amount?: number | null
  late_fee_percentage?: number | null
  grace_period_days?: number
  payment_due_day?: number
  lease_terms?: Record<string, unknown> | null
  special_clauses?: string | null
  lease_document_id?: number | null
}

export interface LeaseUploadSigned {
  lease_document_id: number
  signed_by_owner?: boolean
  signed_by_tenant?: boolean
}

export interface LeaseRenew {
  start_date: string
  end_date: string
  monthly_rent?: number | null
  security_deposit?: number | null
  make_active?: boolean
}

export interface RentCharge {
  id: number
  lease_id: number
  property_id: number
  owner_id: number
  tenant_user_id?: number | null
  billing_month: string
  period_start: string
  period_end: string
  due_date: string
  amount_due: number
  late_fee_assessed: number
  status: RentChargeStatus
  created_at: string
  updated_at?: string | null
}

export interface RentChargeWithTotals {
  charge: RentCharge
  amount_paid_total: number
  amount_due_total: number
  outstanding: number
}

export interface RentChargeGenerateRequest {
  owner_id?: number | null
  lease_id?: number | null
  start_month?: string | null
  months?: number
}

export interface RentPayment {
  id: number
  charge_id: number
  lease_id: number
  property_id: number
  owner_id: number
  tenant_user_id?: number | null
  paid_at: string
  amount_paid: number
  payment_method?: string | null
  reference?: string | null
  notes?: string | null
  receipt_document_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface RentPaymentCreate {
  charge_id: number
  amount_paid: number
  paid_at?: string | null
  payment_method?: string | null
  reference?: string | null
  notes?: string | null
  receipt_document_id?: number | null
}

export interface Expense {
  id: number
  property_id: number
  owner_id: number
  category: ExpenseCategory
  amount: number
  expense_date: string
  description?: string | null
  notes?: string | null
  receipt_document_id?: number | null
  is_recurring: boolean
  recurrence_rule?: Record<string, unknown> | null
  next_due_date?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ExpenseCreate {
  owner_id?: number | null
  property_id: number
  category: ExpenseCategory
  amount: number
  expense_date: string
  description?: string | null
  notes?: string | null
  receipt_document_id?: number | null
  is_recurring?: boolean
  recurrence_rule?: Record<string, unknown> | null
  next_due_date?: string | null
}

export interface ExpenseUpdate {
  property_id?: number | null
  category?: ExpenseCategory | null
  amount?: number | null
  expense_date?: string | null
  description?: string | null
  notes?: string | null
  receipt_document_id?: number | null
  is_recurring?: boolean | null
  recurrence_rule?: Record<string, unknown> | null
  next_due_date?: string | null
}

export interface MaintenanceRequest {
  id: number
  property_id: number
  lease_id?: number | null
  owner_id: number
  tenant_user_id?: number | null
  category: MaintenanceCategory
  urgency: MaintenanceUrgency
  title: string
  description?: string | null
  preferred_contact_method?: string | null
  availability_notes?: string | null
  request_status: MaintenanceRequestStatus
  assigned_agent_id?: number | null
  work_order_status?: WorkOrderStatus | null
  priority?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
  scheduled_for?: string | null
  completed_at?: string | null
  closed_at?: string | null
  completion_notes?: string | null
  created_at: string
  updated_at?: string | null
}

export interface MaintenanceRequestCreate {
  property_id: number
  category: MaintenanceCategory
  urgency: MaintenanceUrgency
  title: string
  description?: string | null
  preferred_contact_method?: string | null
  availability_notes?: string | null
}

export interface MaintenanceRequestUpdate {
  request_status?: MaintenanceRequestStatus | null
  assigned_agent_id?: number | null
  work_order_status?: WorkOrderStatus | null
  priority?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
  scheduled_for?: string | null
  completed_at?: string | null
  closed_at?: string | null
  completion_notes?: string | null
}

export interface Document {
  id: number
  owner_id: number
  user_id?: number | null
  property_id?: number | null
  lease_id?: number | null
  maintenance_request_id?: number | null
  rental_application_id?: number | null
  document_type: DocumentType
  title: string
  file_url: string
  file_path?: string | null
  mime_type?: string | null
  file_size?: number | null
  shared_with_tenant: boolean
  shared_with_agent: boolean
  version: number
  replaces_document_id?: number | null
  created_by_user_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface DocumentUpdate {
  title?: string | null
  shared_with_tenant?: boolean | null
  shared_with_agent?: boolean | null
}

export interface DocumentDownload {
  url: string
}

export interface InspectionChecklist {
  id: number
  property_id: number
  lease_id: number
  owner_id: number
  inspection_type: InspectionType
  conducted_by_user_id: number
  conducted_at: string
  rooms_data?: Record<string, unknown> | null
  overall_notes?: string | null
  tenant_signature_document_id?: number | null
  owner_signature_document_id?: number | null
  signed_by_tenant_at?: string | null
  signed_by_owner_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface InspectionChecklistCreate {
  owner_id?: number | null
  lease_id: number
  inspection_type: InspectionType
  rooms_data?: Record<string, unknown> | null
  overall_notes?: string | null
  conducted_at?: string | null
}

export interface InspectionSign {
  tenant_signature_document_id?: number | null
  owner_signature_document_id?: number | null
}

export interface RentRollItem {
  property_id: number
  title: string
  occupancy: string
  tenant_user_id?: number | null
  monthly_rent?: number | null
  lease_end_date?: string | null
}

export interface IncomeReport {
  total_income: number
  start?: string | null
  end?: string | null
}

export interface ExpenseReport {
  total_expenses: number
  start?: string | null
  end?: string | null
}

export interface PnLReport {
  total_income: number
  total_expenses: number
  net_income: number
  start?: string | null
  end?: string | null
}

export interface OccupancyReport {
  total: number
  occupied: number
  vacant: number
}

export interface MaintenanceReport {
  total_requests: number
}

export interface TenantSummary {
  user_id: number
  full_name?: string | null
  phone?: string | null
  email?: string | null
  active_leases_count: number
}

export interface TenantDetail {
  user_id: number
  full_name?: string | null
  phone?: string | null
  email?: string | null
  leases: Lease[]
}

export interface OwnerRMAssignmentCreate {
  owner_user_id?: number | null
  agent_id?: number | null
}

export interface OwnerRMAssignmentUpdate {
  agent_id?: number | null
}

export interface OwnerRMAssignmentResponse {
  owner_user_id: number
  agent_id?: number | null
  agent?: Record<string, unknown> | null
}

export interface RentalApplicationForm {
  id: number
  owner_id: number
  property_id?: number | null
  title: string
  description?: string | null
  slug: string
  is_active: boolean
  application_fee_amount?: number | null
  required_document_types?: Record<string, unknown> | null
  questions?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

export interface RentalApplicationFormCreate {
  owner_id?: number | null
  property_id?: number | null
  title: string
  description?: string | null
  application_fee_amount?: number | null
  required_document_types?: Record<string, unknown> | null
  questions?: Record<string, unknown> | null
  config?: Record<string, unknown> | null
}

export interface RentalApplicationDecision {
  decision: TenantStatus
}

export interface RentalApplication {
  id: number
  form_id: number
  property_id: number
  owner_id: number
  status: TenantStatus
  applicant_user_id?: number | null
  applicant_full_name?: string | null
  applicant_phone?: string | null
  applicant_email?: string | null
  answers?: Record<string, unknown> | null
  application_data?: Record<string, unknown> | null
  emergency_contacts?: Record<string, unknown> | null
  submitted_at?: string | null
  decision_at?: string | null
  decided_by_user_id?: number | null
  created_at: string
  updated_at?: string | null
}

export interface ManagedPropertyDetail {
  property: PmProperty
  active_lease?: Lease | null
}
