/**
 * Property management (PM) types.
 *
 * Every wire type is an alias of the generated OpenAPI components
 * (`src/lib/api/schema.gen.ts`, regenerate with `npm run api:sync && npm run api:types`).
 * Do not hand-write a type that the backend already declares. Money is a JSON number,
 * datetimes are UTC ISO strings ending in `Z`, date-only fields are `YYYY-MM-DD`.
 */
import type { components } from '@/lib/api/schema.gen'
import type { QueryOf } from './api'

type S = components['schemas']

// Property enums live in `types/api.ts` (single source of truth). Re-exported so existing PM imports keep working.
export type { PropertyPurpose, PropertyType, PropertyStatus, KitchenType, VentilationType, FurnishingLevel } from './api'

// ---------------------------------------------------------------------------
// Enums (wire values exactly as the backend sends them)
// ---------------------------------------------------------------------------
export type ManagedPropertyStatus = S['ManagedPropertyStatus']
/** A tenant is `active` or `vacated`. An application has its own `RentalApplicationStatus`. */
export type TenantStatus = S['TenantStatus']
export type RentalApplicationStatus = S['RentalApplicationStatus']
export type LeaseStatus = S['LeaseStatus']
export type RentChargeStatus = S['RentChargeStatus']
export type RentPaymentStatus = S['RentPaymentStatus']
export type PaymentMethod = S['PaymentMethod']
export type ExpenseCategory = S['ExpenseCategory']
export type MaintenanceUrgency = S['MaintenanceUrgency']
export type MaintenanceCategory = S['MaintenanceCategory']
export type MaintenanceRequestStatus = S['MaintenanceRequestStatus']
export type WorkOrderStatus = S['WorkOrderStatus']
export type DocumentType = S['DocumentType']
export type InspectionType = S['InspectionType']
export type ApplicationFieldType = S['ApplicationFieldType']

// ---------------------------------------------------------------------------
// Dashboard and reports
// ---------------------------------------------------------------------------
export type DashboardOverview = S['DashboardOverview']
export type ActivityItem = S['ActivityItem']
export type RentRollItem = S['RentRollItem']
export type IncomeReport = S['IncomeReport']
export type ExpenseReport = S['ExpenseReport']
export type PnLReport = S['PnLReport']
export type OccupancyReport = S['OccupancyReport']
export type MaintenanceReport = S['MaintenanceReport']

// ---------------------------------------------------------------------------
// Managed properties
// ---------------------------------------------------------------------------
/** A managed property is the core listing `Property` with the PM fields filled in. */
export type PmProperty = S['Property']
export type PmPropertyCreate = S['ManagedPropertyCreate']
export type ManagedPropertyUpdate = S['ManagedPropertyUpdate']
export type ManagedPropertyDetail = S['ManagedPropertyDetail']

// ---------------------------------------------------------------------------
// Leases, rent, expenses
// ---------------------------------------------------------------------------
export type Lease = S['Lease']
export type LeaseCreate = S['LeaseCreate']
export type LeaseUploadSigned = S['LeaseUploadSigned']
export type LeaseRenew = S['LeaseRenew']
export type LeaseTerminate = S['LeaseTerminate']
export type RentCharge = S['RentCharge']
export type RentChargeWithTotals = S['RentChargeWithTotals']
export type RentChargeGenerateRequest = S['RentChargeGenerateRequest']
export type RentChargeGenerateResult = S['RentChargeGenerateResult']
export type RentPayment = S['RentPayment']
export type RentPaymentCreate = S['RentPaymentCreate']
export type Expense = S['Expense']
export type ExpenseCreate = S['ExpenseCreate']
export type ExpenseUpdate = S['ExpenseUpdate']

// ---------------------------------------------------------------------------
// Maintenance, documents, inspections
// ---------------------------------------------------------------------------
export type MaintenanceRequest = S['MaintenanceRequest']
export type MaintenanceRequestCreate = S['MaintenanceRequestCreate']
export type MaintenanceRequestUpdate = S['MaintenanceRequestUpdate']
/** `file_url` is null unless the caller may open the file. */
export type Document = S['Document']
export type DocumentUpdate = S['DocumentUpdate']
export type InspectionChecklist = S['InspectionChecklist']
export type InspectionChecklistCreate = S['InspectionChecklistCreate']
export type InspectionSign = S['InspectionSign']

// ---------------------------------------------------------------------------
// Rental applications
// ---------------------------------------------------------------------------
export type CustomField = S['CustomField']
export type RentalApplicationForm = S['RentalApplicationForm']
export type RentalApplicationFormCreate = S['RentalApplicationFormCreate']
/** `decision` is `approved` or `rejected`, with optional `notes`. */
export type RentalApplicationDecision = S['RentalApplicationDecision']
export type RentalApplication = S['RentalApplication']

// ---------------------------------------------------------------------------
// List queries (keys taken from the spec, so an undeclared key fails the type check)
// ---------------------------------------------------------------------------
export type PmOwnerQuery = QueryOf<'/api/v1/pm/dashboard/overview'>
export type PmActivityQuery = QueryOf<'/api/v1/pm/dashboard/activity'>
export type PmPropertiesQuery = QueryOf<'/api/v1/pm/properties'>
export type PmLeasesQuery = QueryOf<'/api/v1/pm/leases'>
export type RentChargesQuery = QueryOf<'/api/v1/pm/rent/charges'>
export type RentPaymentsQuery = QueryOf<'/api/v1/pm/rent/payments'>
export type PmExpensesQuery = QueryOf<'/api/v1/pm/expenses'>
export type MaintenanceRequestsQuery = QueryOf<'/api/v1/pm/maintenance/requests'>
export type PmDocumentsQuery = QueryOf<'/api/v1/pm/documents'>
export type PmInspectionsQuery = QueryOf<'/api/v1/pm/inspections'>
export type PmApplicationsQuery = QueryOf<'/api/v1/pm/applications'>
export type PmApplicationFormsQuery = QueryOf<'/api/v1/pm/applications/forms'>
export type RentRollQuery = QueryOf<'/api/v1/pm/reports/rent-roll'>
export type PmReportQuery = QueryOf<'/api/v1/pm/reports/income'>
