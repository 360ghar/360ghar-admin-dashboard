/**
 * Managed property create and edit form: field catalogue and the pure conversion code.
 *
 * `POST /pm/properties` takes `ManagedPropertyCreate` and `PATCH /pm/properties/{id}` takes
 * `ManagedPropertyUpdate`. Both reject any undeclared key with 422, and the field list is long
 * (the core listing fields plus the PM terms). The catalogue below holds one entry per declared
 * field. `PROPERTY_FIELDS` is typed as a record over every declared listing key, so a field that
 * the backend adds or drops fails the type check until the catalogue follows.
 *
 * All form values are strings. The builders turn them into the typed request body.
 */
import { isRecord } from '@/lib/storage'
import { safeJsonObject } from '@/lib/json'
import type {
  FurnishingLevel,
  KitchenType,
  ManagedPropertyStatus,
  ManagedPropertyUpdate,
  PmProperty,
  PmPropertyCreate,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  VentilationType,
} from '@/types/pm'
import { VALIDATION } from './constants'

export type PropertyFormMode = 'create' | 'edit'
export type PropertyFormValues = Record<string, string>

// ---------------------------------------------------------------------------
// Option lists (wire values exactly as the backend sends them)
// ---------------------------------------------------------------------------
export const PROPERTY_TYPES = [
  'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo',
  'penthouse', 'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
] as const satisfies readonly PropertyType[]
export const PROPERTY_PURPOSES = ['rent', 'buy', 'short_stay'] as const satisfies readonly PropertyPurpose[]
export const PROPERTY_STATUSES = ['available', 'sold', 'rented', 'under_offer', 'maintenance'] as const satisfies readonly PropertyStatus[]
export const KITCHEN_TYPES = ['vegetarian', 'non_vegetarian', 'eggetarian', 'any'] as const satisfies readonly KitchenType[]
export const VENTILATION_TYPES = ['good', 'average', 'poor'] as const satisfies readonly VentilationType[]
export const FURNISHING_LEVELS = ['furnished', 'semi_furnished', 'unfurnished'] as const satisfies readonly FurnishingLevel[]
export const GENDER_PREFERENCES = ['any', 'male', 'female'] as const
export const SHARING_TYPES = ['private_room', 'shared_room', 'master_bedroom', 'entire_flat'] as const
export const MANAGEMENT_STATUSES = ['draft', 'active', 'archived'] as const satisfies readonly ManagedPropertyStatus[]

/** The backend allows one amount up to NUMERIC(12,2). */
const MONEY_MAX = 9_999_999_999.99

// ---------------------------------------------------------------------------
// Field catalogue
// ---------------------------------------------------------------------------
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'int'
  | 'decimal'
  | 'date'
  | 'boolean'
  | 'select'
  /** One item per line. */
  | 'list'
  /** Amenity ids, stored as a comma separated string and picked from the amenity list. */
  | 'amenities'
  /** A JSON object. */
  | 'json'

export type PropertySection = 'basics' | 'pricing' | 'location' | 'details' | 'features' | 'listing' | 'owner'

export interface FieldSpec {
  label: string
  kind: FieldKind
  section: PropertySection
  /** Select options. */
  options?: readonly string[]
  min?: number
  max?: number
  /** The create body requires it. */
  required?: boolean
  /** The backend gives 422 for an explicit null, so an emptied field is not sent on edit. */
  notNull?: boolean
  /** Only on one form. Default: both. */
  only?: PropertyFormMode
  /** Every value must be an absolute http(s) URL. */
  url?: boolean
  hint?: string
}

/** PM terms: handled by the terms block, not the catalogue. `owner_id` comes from the owner selector. */
type PmTermKey = 'management_status' | 'payment_due_day' | 'grace_period_days' | 'late_fee_policy'
/**
 * `ManagedPropertyUpdate.images` is the PM spelling of `image_urls`: both replace every image except
 * the floor plans. The form has one control, keyed `image_urls`, and sends that key on create and edit.
 */
export const DUPLICATE_KEYS = ['images'] as const
export type PropertyFieldKey = Exclude<
  keyof PmPropertyCreate | keyof ManagedPropertyUpdate,
  PmTermKey | 'owner_id' | (typeof DUPLICATE_KEYS)[number]
>

export const PROPERTY_SECTIONS: { id: PropertySection; title: string }[] = [
  { id: 'basics', title: 'Basics' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'location', title: 'Location' },
  { id: 'details', title: 'Details' },
  { id: 'features', title: 'Features, amenities and media' },
  { id: 'listing', title: 'Listing preferences' },
  { id: 'owner', title: 'Owner and marketing' },
]

const money = { kind: 'decimal', min: 0, max: MONEY_MAX } as const

export const PROPERTY_FIELDS: Record<PropertyFieldKey, FieldSpec> = {
  title: { label: 'Title', kind: 'text', section: 'basics', required: true, notNull: true },
  description: { label: 'Description', kind: 'textarea', section: 'basics' },
  property_type: { label: 'Property type', kind: 'select', section: 'basics', options: PROPERTY_TYPES, required: true, notNull: true },
  purpose: { label: 'Purpose', kind: 'select', section: 'basics', options: PROPERTY_PURPOSES, required: true, notNull: true },
  status: { label: 'Listing status', kind: 'select', section: 'basics', options: PROPERTY_STATUSES, notNull: true },
  is_available: { label: 'Available', kind: 'boolean', section: 'basics', notNull: true },
  available_from: { label: 'Available from', kind: 'date', section: 'basics' },

  base_price: { label: 'Base price (₹)', section: 'pricing', required: true, notNull: true, ...money },
  monthly_rent: { label: 'Monthly rent (₹)', section: 'pricing', hint: 'Required for rent, PG and flatmate listings. Defaults to the base price.', ...money },
  daily_rate: { label: 'Daily rate (₹ per night)', section: 'pricing', ...money },
  security_deposit: { label: 'Security deposit (₹)', section: 'pricing', ...money },
  maintenance_charges: { label: 'Maintenance charges (₹)', section: 'pricing', ...money },
  setup_cost: { label: 'Setup cost (₹)', section: 'pricing', ...money },
  other_charges: { label: 'Other charges (₹)', section: 'pricing', ...money },
  other_charges_description: { label: 'Other charges description', kind: 'text', section: 'pricing', max: 300 },

  city: { label: 'City', kind: 'text', section: 'location' },
  state: { label: 'State', kind: 'text', section: 'location' },
  country: { label: 'Country', kind: 'text', section: 'location', notNull: true },
  pincode: { label: 'Pincode', kind: 'text', section: 'location' },
  locality: { label: 'Locality', kind: 'text', section: 'location' },
  sub_locality: { label: 'Sub locality', kind: 'text', section: 'location' },
  landmark: { label: 'Landmark', kind: 'text', section: 'location' },
  full_address: { label: 'Full address', kind: 'text', section: 'location' },
  latitude: { label: 'Latitude', kind: 'decimal', section: 'location', min: -90, max: 90 },
  longitude: { label: 'Longitude', kind: 'decimal', section: 'location', min: -180, max: 180 },
  area_type: { label: 'Area type', kind: 'text', section: 'location' },

  area_sqft: { label: 'Area (sq ft)', kind: 'decimal', section: 'details', min: 0, max: 1_000_000 },
  bedrooms: { label: 'Bedrooms', kind: 'int', section: 'details', min: 0, max: 50 },
  bathrooms: { label: 'Bathrooms', kind: 'int', section: 'details', min: 0, max: 50 },
  balconies: { label: 'Balconies', kind: 'int', section: 'details', min: 0, max: 50 },
  parking_spaces: { label: 'Parking spaces', kind: 'int', section: 'details', min: 0, max: 100 },
  floor_number: { label: 'Floor number', kind: 'int', section: 'details', min: -5, max: 200 },
  total_floors: { label: 'Total floors', kind: 'int', section: 'details', min: 0, max: 200 },
  age_of_property: { label: 'Age of property (years)', kind: 'int', section: 'details', min: 0, max: 500 },
  max_occupancy: { label: 'Max occupancy', kind: 'int', section: 'details', min: 0, max: 1000 },
  minimum_stay_days: { label: 'Minimum stay (days)', kind: 'int', section: 'details', min: 1, max: 3650, notNull: true },
  furnishing_level: {
    label: 'Furnishing', kind: 'select', section: 'details', options: FURNISHING_LEVELS,
    hint: 'A listing with room level furnishing gets its furnishing from the rooms.',
  },
  kitchen_type: { label: 'Kitchen type', kind: 'select', section: 'details', options: KITCHEN_TYPES },
  ventilation_type: { label: 'Ventilation', kind: 'select', section: 'details', options: VENTILATION_TYPES },
  windows_count: { label: 'Windows', kind: 'int', section: 'details', min: 0, max: 100 },
  ventilation_shafts: { label: 'Ventilation shafts', kind: 'int', section: 'details', min: 0, max: 50 },

  features: { label: 'Features (one per line)', kind: 'list', section: 'features' },
  tags: { label: 'Tags (one per line)', kind: 'list', section: 'features' },
  amenity_ids: { label: 'Amenities', kind: 'amenities', section: 'features' },
  main_image_url: { label: 'Main image URL', kind: 'text', section: 'features', url: true },
  image_urls: {
    label: 'Image URLs (one per line)', kind: 'list', section: 'features', url: true,
    hint: 'On edit, replaces every image except floor plans.',
  },
  floor_plans: {
    label: 'Floor plan image URLs (one per line)', kind: 'list', section: 'features', url: true, only: 'edit',
    hint: 'Replaces every floor plan image.',
  },
  floor_plan_url: { label: 'Floor plan URL', kind: 'text', section: 'features', url: true },
  video_urls: { label: 'Video URLs (one per line)', kind: 'list', section: 'features', url: true },
  virtual_tour_url: { label: 'Virtual tour URL', kind: 'text', section: 'features', url: true },
  video_tour_url: { label: 'Video tour URL', kind: 'text', section: 'features', url: true },
  google_street_view_url: { label: 'Google Street View URL', kind: 'text', section: 'features', url: true },
  calendar_data: { label: 'Calendar data (JSON object)', kind: 'json', section: 'features' },

  listing_preferences: { label: 'Listing preferences (JSON object)', kind: 'json', section: 'listing' },
  gender_preference: { label: 'Gender preference', kind: 'select', section: 'listing', options: GENDER_PREFERENCES },
  sharing_type: { label: 'Sharing type', kind: 'select', section: 'listing', options: SHARING_TYPES },
  society_type: { label: 'Society type', kind: 'text', section: 'listing' },
  society_amenities: { label: 'Society amenities (one per line)', kind: 'list', section: 'listing' },
  society_vibe_tags: { label: 'Society vibe tags (one per line)', kind: 'list', section: 'listing' },

  owner_name: { label: 'Owner name', kind: 'text', section: 'owner' },
  owner_contact: { label: 'Owner contact', kind: 'text', section: 'owner' },
  builder_name: { label: 'Builder name', kind: 'text', section: 'owner' },
  search_keywords: { label: 'Search keywords', kind: 'text', section: 'owner' },
}

const FIELD_KEYS = Object.keys(PROPERTY_FIELDS) as PropertyFieldKey[]

/** The catalogue keys that belong on one form. */
export function fieldKeysFor(mode: PropertyFormMode): PropertyFieldKey[] {
  return FIELD_KEYS.filter((key) => {
    const only = PROPERTY_FIELDS[key].only
    return only === undefined || only === mode
  })
}

// ---------------------------------------------------------------------------
// PM terms and the late fee policy
// ---------------------------------------------------------------------------
export type LateFeeType = 'none' | 'fixed' | 'percentage'

export const TERM_KEYS = [
  'management_status', 'payment_due_day', 'grace_period_days', 'late_fee_type', 'late_fee_amount', 'late_fee_percent',
] as const

export interface LateFeeTerms {
  type: LateFeeType
  amount: string
  percent: string
}

const scalarText = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

/** Read the stored policy `{type: 'fixed', amount}` or `{type: 'percentage', percent}`. Anything else is "none". */
export function parseLateFeePolicy(policy: unknown): LateFeeTerms {
  if (!isRecord(policy)) return { type: 'none', amount: '', percent: '' }
  if (policy.type === 'fixed') return { type: 'fixed', amount: scalarText(policy.amount), percent: '' }
  if (policy.type === 'percentage') return { type: 'percentage', amount: '', percent: scalarText(policy.percent) }
  return { type: 'none', amount: '', percent: '' }
}

function buildLateFeePolicy(values: PropertyFormValues): Record<string, unknown> | null {
  if (values.late_fee_type === 'fixed') return { type: 'fixed', amount: Number(values.late_fee_amount) }
  if (values.late_fee_type === 'percentage') return { type: 'percentage', percent: Number(values.late_fee_percent) }
  return null
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------
export function emptyPropertyValues(): PropertyFormValues {
  const values: PropertyFormValues = {}
  for (const key of FIELD_KEYS) values[key] = ''
  values.property_type = 'apartment'
  values.purpose = 'rent'
  values.country = 'India'
  values.minimum_stay_days = '1'
  values.management_status = 'active'
  values.payment_due_day = '1'
  values.grace_period_days = String(VALIDATION.GRACE_PERIOD_DAYS_DEFAULT)
  values.late_fee_type = 'none'
  values.late_fee_amount = ''
  values.late_fee_percent = ''
  return values
}

function formatValue(spec: FieldSpec, raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  switch (spec.kind) {
    case 'list':
      return Array.isArray(raw) ? raw.map(String).join('\n') : ''
    case 'amenities':
      return Array.isArray(raw) ? raw.map(String).join(',') : ''
    case 'json':
      return isRecord(raw) ? JSON.stringify(raw, null, 2) : ''
    case 'boolean':
      return typeof raw === 'boolean' ? String(raw) : ''
    default:
      return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''
  }
}

/** Flatmate preferences are stored inside `listing_preferences`, so the response has no top level key for them. */
const PREFERENCE_KEYS: readonly PropertyFieldKey[] = ['gender_preference', 'sharing_type', 'society_type', 'society_amenities', 'society_vibe_tags']

/** Edit form values from the stored property. Blank means "no value". */
export function valuesFromProperty(property: PmProperty): PropertyFormValues {
  const values = emptyPropertyValues()
  const source: Record<string, unknown> = { ...property }
  const preferences: Record<string, unknown> = isRecord(property.listing_preferences) ? property.listing_preferences : {}
  for (const key of fieldKeysFor('edit')) {
    const spec = PROPERTY_FIELDS[key]
    if (PREFERENCE_KEYS.includes(key)) values[key] = formatValue(spec, preferences[key])
    else values[key] = formatValue(spec, source[key])
  }
  values.amenity_ids = formatValue(PROPERTY_FIELDS.amenity_ids, (property.amenities ?? []).map((a) => a.id))
  const images = property.images ?? []
  values.image_urls = formatValue(
    PROPERTY_FIELDS.image_urls,
    images.filter((i) => i.image_category !== 'floor_plan').map((i) => i.image_url),
  )
  const plans = property.floor_plans?.length ? property.floor_plans : images.filter((i) => i.image_category === 'floor_plan')
  values.floor_plans = formatValue(PROPERTY_FIELDS.floor_plans, plans.map((i) => i.image_url))
  values.management_status = property.management_status ?? 'active'
  values.payment_due_day = String(property.payment_due_day ?? 1)
  values.grace_period_days = String(property.grace_period_days ?? VALIDATION.GRACE_PERIOD_DAYS_DEFAULT)
  const lateFee = parseLateFeePolicy(property.late_fee_policy)
  values.late_fee_type = lateFee.type
  values.late_fee_amount = lateFee.amount
  values.late_fee_percent = lateFee.percent
  return values
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const isBlank = (raw: string | undefined) => raw === undefined || raw.trim() === ''
const listItems = (raw: string) => raw.split('\n').map((line) => line.trim()).filter(Boolean)
const URL_PATTERN = /^https?:\/\/\S+$/i

function checkNumber(spec: FieldSpec, raw: string): string | null {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'Enter a number'
  if (spec.kind === 'int' && !Number.isInteger(n)) return 'Enter a whole number'
  if (spec.min !== undefined && n < spec.min) return `Must be at least ${spec.min}`
  if (spec.max !== undefined && n > spec.max) return `Must be at most ${spec.max}`
  return null
}

function checkField(spec: FieldSpec, raw: string): string | null {
  switch (spec.kind) {
    case 'int':
    case 'decimal':
      return checkNumber(spec, raw)
    case 'text':
      if (spec.max !== undefined && raw.length > spec.max) return `Must be ${spec.max} characters or fewer`
      return spec.url && !URL_PATTERN.test(raw.trim()) ? 'Enter a full URL starting with http:// or https://' : null
    case 'list':
      return spec.url && listItems(raw).some((item) => !URL_PATTERN.test(item)) ? 'Each line must be a full URL starting with http:// or https://' : null
    case 'select':
      return spec.options && !spec.options.includes(raw) ? 'Choose one of the listed values' : null
    case 'boolean':
      return raw === 'true' || raw === 'false' ? null : 'Choose yes or no'
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? null : 'Use the format YYYY-MM-DD'
    case 'json':
      return safeJsonObject(raw) === null ? 'Must be a valid JSON object' : null
    case 'amenities':
      return raw.split(',').every((id) => Number.isInteger(Number(id)) && Number(id) > 0) ? null : 'Invalid amenity list'
    default:
      return null
  }
}

/**
 * Field errors for the form: `{ fieldName: message }`. An empty object means the values are valid.
 * On edit, pass the values the form opened with: a field the user did not change is not sent, so an old
 * stored value that breaks a rule (legacy data) must not block saving another field.
 */
export function validatePropertyValues(
  values: PropertyFormValues,
  mode: PropertyFormMode,
  initial?: PropertyFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const unchanged = (key: string) => initial !== undefined && values[key] === initial[key]
  for (const key of fieldKeysFor(mode)) {
    if (unchanged(key)) continue
    const spec = PROPERTY_FIELDS[key]
    const raw = values[key] ?? ''
    if (isBlank(raw)) {
      if (spec.required && mode === 'create') errors[key] = `${spec.label.replace(/ \(.*\)$/, '')} is required`
      else if (spec.notNull && mode === 'edit' && spec.kind !== 'boolean' && spec.kind !== 'select') errors[key] = 'Cannot be empty'
      continue
    }
    const message = checkField(spec, raw)
    if (message) errors[key] = message
  }
  // Backend rule: PG and flatmate listings are rent listings. Checked when either field changed.
  const typeOrPurposeChanged = !unchanged('property_type') || !unchanged('purpose')
  if (
    typeOrPurposeChanged &&
    (values.property_type === 'pg' || values.property_type === 'flatmate') &&
    values.purpose !== 'rent' &&
    !errors.purpose
  ) {
    errors.purpose = "PG and flatmate listings must use purpose 'rent'"
  }

  const dueDay = Number(values.payment_due_day)
  if (
    !unchanged('payment_due_day') &&
    (!Number.isInteger(dueDay) || dueDay < VALIDATION.PAYMENT_DUE_DAY_MIN || dueDay > VALIDATION.PAYMENT_DUE_DAY_MAX)
  ) {
    errors.payment_due_day = `Must be a whole number from ${VALIDATION.PAYMENT_DUE_DAY_MIN} to ${VALIDATION.PAYMENT_DUE_DAY_MAX}`
  }
  const grace = Number(values.grace_period_days)
  if (!unchanged('grace_period_days') && (!Number.isInteger(grace) || grace < 0 || grace > VALIDATION.GRACE_PERIOD_DAYS_MAX)) {
    errors.grace_period_days = `Must be a whole number from 0 to ${VALIDATION.GRACE_PERIOD_DAYS_MAX}`
  }
  if (values.late_fee_type === 'fixed' && !(unchanged('late_fee_type') && unchanged('late_fee_amount'))) {
    const amount = Number(values.late_fee_amount)
    if (isBlank(values.late_fee_amount) || !Number.isFinite(amount) || amount < 0) errors.late_fee_amount = 'Enter an amount of 0 or more'
  }
  if (values.late_fee_type === 'percentage' && !(unchanged('late_fee_type') && unchanged('late_fee_percent'))) {
    const percent = Number(values.late_fee_percent)
    if (isBlank(values.late_fee_percent) || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      errors.late_fee_percent = 'Enter a percentage from 0 to 100'
    }
  }
  return errors
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------
/** The typed value of one non-blank form value. `validatePropertyValues` ran first. */
function parseValue(spec: FieldSpec, raw: string): unknown {
  switch (spec.kind) {
    case 'int':
    case 'decimal':
      return Number(raw)
    case 'boolean':
      return raw === 'true'
    case 'list':
      return listItems(raw)
    case 'amenities':
      return raw.split(',').map(Number)
    case 'json':
      return safeJsonObject(raw)
    case 'date':
    case 'select':
      return raw
    default:
      return raw.trim()
  }
}

/**
 * The create body: only the non-blank fields, plus the PM terms. A blank monthly rent on a rent,
 * PG or flatmate listing takes the base price (the backend rejects a rent listing without rent).
 */
export function buildCreateBody(values: PropertyFormValues, ownerId: number): PmPropertyCreate {
  const body: Partial<Record<PropertyFieldKey | PmTermKey | 'owner_id', unknown>> = { owner_id: ownerId }
  for (const key of fieldKeysFor('create')) {
    if (!isBlank(values[key])) body[key] = parseValue(PROPERTY_FIELDS[key], values[key])
  }
  const isRentListing = values.purpose === 'rent' || values.property_type === 'pg' || values.property_type === 'flatmate'
  if (isRentListing && body.monthly_rent === undefined) body.monthly_rent = body.base_price
  body.management_status = values.management_status
  body.payment_due_day = Number(values.payment_due_day)
  body.grace_period_days = Number(values.grace_period_days)
  const policy = buildLateFeePolicy(values)
  if (policy) body.late_fee_policy = policy
  // The keys are the declared ones (typed by the catalogue) and the values were parsed by kind.
  return body as PmPropertyCreate
}

/**
 * The PATCH body: only the fields the user changed, so an untouched field (for example the masked
 * owner contact an agent sees) is never written back. A cleared nullable field is sent as null.
 */
export function buildUpdateBody(values: PropertyFormValues, initial: PropertyFormValues): ManagedPropertyUpdate {
  const body: Partial<Record<PropertyFieldKey | PmTermKey, unknown>> = {}
  for (const key of fieldKeysFor('edit')) {
    if (values[key] === initial[key]) continue
    const spec = PROPERTY_FIELDS[key]
    if (!isBlank(values[key])) body[key] = parseValue(spec, values[key])
    else if (!spec.notNull) body[key] = null
  }
  if (values.management_status !== initial.management_status) body.management_status = values.management_status
  if (values.payment_due_day !== initial.payment_due_day) body.payment_due_day = Number(values.payment_due_day)
  if (values.grace_period_days !== initial.grace_period_days) body.grace_period_days = Number(values.grace_period_days)
  const lateFeeChanged = (['late_fee_type', 'late_fee_amount', 'late_fee_percent'] as const).some((k) => values[k] !== initial[k])
  if (lateFeeChanged) body.late_fee_policy = buildLateFeePolicy(values)
  return body as ManagedPropertyUpdate
}
