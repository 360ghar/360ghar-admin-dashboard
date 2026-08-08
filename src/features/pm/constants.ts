/**
 * PM Module Constants
 * Centralized constants aligned with backend enums and validations
 */

import type {
  ExpenseCategory,
  MaintenanceCategory,
  MaintenanceUrgency,
  MaintenanceRequestStatus,
  WorkOrderStatus,
  LeaseStatus,
  RentChargeStatus,
  InspectionType,
  DocumentType,
  ManagedPropertyStatus,
  TenantStatus,
} from '@/types/pm'

// ============================================================================
// Lease Status
// ============================================================================

export const LEASE_STATUSES: { value: LeaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'renewed', label: 'Renewed' },
]

/**
 * Lease statuses the backend allows terminating. POST /pm/leases/{id}/terminate
 * returns 400 for any other status (e.g. expired/renewed/draft).
 */
export const TERMINATABLE_LEASE_STATUSES: LeaseStatus[] = ['active', 'expiring_soon', 'pending_signature']

// ============================================================================
// Rent Charge Status
// ============================================================================

export const RENT_CHARGE_STATUSES: { value: RentChargeStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'waived', label: 'Waived' },
]

// ============================================================================
// Expense Categories (aligned with backend ExpenseCategory enum)
// ============================================================================

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'property_tax', label: 'Property Tax' },
  { value: 'hoa', label: 'HOA' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Maintenance Categories (aligned with backend MaintenanceCategory enum)
// ============================================================================

export const MAINTENANCE_CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Maintenance Urgency (aligned with backend MaintenanceUrgency enum)
// ============================================================================

export const MAINTENANCE_URGENCIES: { value: MaintenanceUrgency; label: string }[] = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// ============================================================================
// Maintenance Request Status (aligned with backend MaintenanceRequestStatus enum)
// ============================================================================

export const MAINTENANCE_REQUEST_STATUSES: { value: MaintenanceRequestStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'work_order_created', label: 'Work Order Created' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

// ============================================================================
// Work Order Status (aligned with backend WorkOrderStatus enum)
// ============================================================================

export const WORK_ORDER_STATUSES: { value: WorkOrderStatus; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// ============================================================================
// Inspection Types (aligned with backend InspectionType enum)
// ============================================================================

export const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'routine', label: 'Routine' },
]

// ============================================================================
// Document Types (aligned with backend DocumentType enum)
// ============================================================================

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'property_deed', label: 'Property Deed' },
  { value: 'insurance_policy', label: 'Insurance Policy' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Managed Property Status
// ============================================================================

export const MANAGED_PROPERTY_STATUSES: { value: ManagedPropertyStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

// ============================================================================
// Tenant/Application Status
// ============================================================================

export const TENANT_STATUSES: { value: TenantStatus; label: string }[] = [
  { value: 'applicant', label: 'Applicant' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'notice_period', label: 'Notice Period' },
  { value: 'vacated', label: 'Vacated' },
  { value: 'rejected', label: 'Rejected' },
]

// ============================================================================
// Payment Methods (commonly used values)
// ============================================================================

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Pagination
// ============================================================================

export const PAGE_SIZES = [25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 50

// ============================================================================
// Validation Constants (aligned with backend constraints)
// ============================================================================

export const VALIDATION = {
  /** Payment due day must be between 1-28 (backend handles months with fewer days) */
  PAYMENT_DUE_DAY_MIN: 1,
  PAYMENT_DUE_DAY_MAX: 28,

  /** Default grace period days */
  GRACE_PERIOD_DAYS_DEFAULT: 5,

  /** Maximum months for rent charge generation */
  RENT_GENERATE_MONTHS_MAX: 24,

  /** Pagination limits enforced by backend */
  PAGINATION_LIMIT_MAX: 200,

  /** Minimum amount for expenses/payments (must be > 0) */
  AMOUNT_MIN: 0.01,
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get label for a status value from a status array
 */
export function getStatusLabel<T extends string>(
  statuses: { value: T; label: string }[],
  value: T | undefined | null
): string {
  if (!value) return '-'
  const status = statuses.find((s) => s.value === value)
  return status?.label ?? value
}

/**
 * Validate payment due day is within backend constraints
 */
export function isValidPaymentDueDay(day: number): boolean {
  return Number.isInteger(day) && day >= VALIDATION.PAYMENT_DUE_DAY_MIN && day <= VALIDATION.PAYMENT_DUE_DAY_MAX
}

/**
 * Validate amount is positive
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0
}

/**
 * Parse numeric input safely, returning null if invalid
 */
export function parseNumericInput(value: string): number | null {
  const num = Number(value)
  return isNaN(num) ? null : num
}
