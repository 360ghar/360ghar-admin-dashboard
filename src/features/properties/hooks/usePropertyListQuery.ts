import { useEffect, useMemo } from 'react'
import { useGetAmenitiesQuery } from '@/features/core/api/amenitiesApi'
import type { PropertySearchParams } from '@/features/properties/api/propertiesApi'
import type { UserRole } from '@/hooks/useUserRole'
import { useScopedDebounce } from '@/hooks/useScopedDebounce'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { PAGE_SIZE_OPTIONS, usePageSizePreference } from '@/hooks/usePageSizePreference'
import type { PropertyFiltersState } from '@/features/properties/components/PropertyFilters'
import {
  PROPERTY_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, KITCHEN_TYPE_OPTIONS, VENTILATION_TYPE_OPTIONS, FURNISHING_LEVEL_OPTIONS,
  isPropertyType, isPropertyPurpose, isPropertyStatus, isSortBy, isKitchenType, isVentilationType, isFurnishingLevel,
} from '@/features/properties/constants'

/** Bounds of the numeric list filters. The backend answers 422 for the whole list when one is out of range. */
const MAX_MONEY = 9999999999.99

/** A number inside [min, max], or undefined (the filter is not sent). `integer` drops decimals. */
function boundedNumber(value: string, min: number, max: number, integer = false): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const n = integer ? Math.trunc(parsed) : parsed
  return n >= min && n <= max ? n : undefined
}

const defaultFilters: PropertyFiltersState & Record<string, unknown> = {
  q: '', city: '', locality: '', propertyType: '', purpose: '', status: '',
  priceMin: '', priceMax: '', bedroomsMin: '', bedroomsMax: '',
  amenities: [] as number[], sortBy: 'newest', showFilters: false,
  furnishing: '', kitchenType: '', ventilationType: '', windowsMin: '', hasLift: false,
}
const filterArrayTypes = { amenities: 'number' } as const
const allowedFilterValues = {
  sortBy: ['newest', 'distance', 'price_low', 'price_high', 'popular', 'relevance'],
  propertyType: ['', ...PROPERTY_TYPES.map((item) => item.value)],
  purpose: ['', ...PROPERTY_PURPOSES.map((item) => item.value)],
  status: ['', ...PROPERTY_STATUSES.map((item) => item.value)],
  furnishing: ['', ...FURNISHING_LEVEL_OPTIONS.map((item) => item.value)],
  kitchenType: ['', ...KITCHEN_TYPE_OPTIONS.map((item) => item.value)],
  ventilationType: ['', ...VENTILATION_TYPE_OPTIONS.map((item) => item.value)],
}

/** Own the list's filter, page-size, cursor, and backend query scope. */
export function usePropertyListQuery(accountId: string | undefined, role: UserRole, agentId?: number | null) {
  const { filters, setFilters, clearFilters } = useFilterPersistence({
    key: 'properties', accountId, defaultValue: defaultFilters,
    arrayItemTypes: filterArrayTypes, allowedValues: allowedFilterValues,
  })
  const selectedAmenities = filters.amenities
  const { data: amenitiesData, error: amenitiesError, refetch: refetchAmenities } = useGetAmenitiesQuery()
  const amenities = useMemo(() => amenitiesData ?? [], [amenitiesData])
  const validSelectedAmenities = useMemo(() => selectedAmenities.filter((id) =>
    amenities.some((amenity) => amenity.id === id)
  ), [selectedAmenities, amenities])
  const waitingForAmenities = selectedAmenities.length > 0 &&
    (!amenitiesData || validSelectedAmenities.length !== selectedAmenities.length)

  useEffect(() => {
    if (amenitiesData && validSelectedAmenities.length !== selectedAmenities.length) {
      setFilters({ amenities: validSelectedAmenities })
    }
  }, [amenitiesData, validSelectedAmenities, selectedAmenities, setFilters])
  const handleAmenityToggle = (amenityId: number) => {
    setFilters({
      amenities: selectedAmenities.includes(amenityId)
        ? selectedAmenities.filter((id) => id !== amenityId)
        : [...selectedAmenities, amenityId],
    })
  }

  const [pageSize, setPageSize] = usePageSizePreference({
    key: 'properties', accountId, defaultSize: 20, sizes: PAGE_SIZE_OPTIONS,
  })
  const dq = useScopedDebounce(filters.q, accountId, 300)
  const dcity = useScopedDebounce(filters.city, accountId, 300)
  const dlocality = useScopedDebounce(filters.locality, accountId, 300)
  const pager = useCursorPagination([
    accountId,
    dq, dcity, dlocality,
    filters.propertyType, filters.purpose, filters.status,
    filters.priceMin, filters.priceMax, filters.bedroomsMin, filters.bedroomsMax,
    selectedAmenities.join(','), filters.sortBy, pageSize,
    filters.furnishing, filters.kitchenType, filters.ventilationType,
    filters.windowsMin, String(filters.hasLift),
  ].join('|'))

  const params = useMemo((): PropertySearchParams => {
    const base: PropertySearchParams = {
      cursor: pager.cursor,
      limit: pageSize,
      sort_by: isSortBy(filters.sortBy) ? filters.sortBy : undefined,
    }
    if (dq) base.q = dq
    if (dcity) base.city = dcity
    if (dlocality) base.locality = dlocality
    if (isPropertyType(filters.propertyType)) base.property_type = [filters.propertyType]
    if (isPropertyPurpose(filters.purpose)) base.purpose = filters.purpose
    // `status` is a declared filter: the list honours it.
    if (isPropertyStatus(filters.status)) base.status = filters.status
    const priceMin = boundedNumber(filters.priceMin, 0, MAX_MONEY)
    const priceMax = boundedNumber(filters.priceMax, 0, MAX_MONEY)
    const bedroomsMin = boundedNumber(filters.bedroomsMin, 0, 50, true)
    const bedroomsMax = boundedNumber(filters.bedroomsMax, 0, 50, true)
    if (priceMin !== undefined) base.price_min = priceMin
    if (priceMax !== undefined) base.price_max = priceMax
    if (bedroomsMin !== undefined) base.bedrooms_min = bedroomsMin
    if (bedroomsMax !== undefined) base.bedrooms_max = bedroomsMax
    if (selectedAmenities.length > 0) {
      const names = selectedAmenities
        .map((id) => amenities.find((amenity) => amenity.id === id))
        .map((amenity) => amenity?.title)
        .filter((value): value is string => Boolean(value))
      if (names.length > 0) base.amenities = names
    }
    // No `radius`: it only applies together with lat and lng, and this screen has neither.
    if (isFurnishingLevel(filters.furnishing)) base.furnishing = [filters.furnishing]
    if (isKitchenType(filters.kitchenType) && filters.kitchenType !== 'any') base.kitchen_type = [filters.kitchenType]
    if (isVentilationType(filters.ventilationType)) base.ventilation_type = [filters.ventilationType]
    const windowsMin = boundedNumber(filters.windowsMin, 0, 100, true)
    if (windowsMin !== undefined) base.windows_min = windowsMin
    if (filters.hasLift) base.has_lift = true
    if (role === 'agent' && agentId) base.exclude_swiped = false
    return base
  }, [
    pager.cursor, pageSize, filters.sortBy, dq, dcity, dlocality,
    filters.propertyType, filters.purpose, filters.status,
    filters.priceMin, filters.priceMax, filters.bedroomsMin, filters.bedroomsMax,
    selectedAmenities, amenities, filters.furnishing,
    filters.kitchenType, filters.ventilationType, filters.windowsMin,
    filters.hasLift, role, agentId,
  ])

  const activeFilterCount = [
    filters.q, filters.city, filters.locality, filters.propertyType,
    filters.purpose, filters.status, filters.priceMin, filters.priceMax,
    filters.bedroomsMin, filters.bedroomsMax,
    filters.furnishing, filters.kitchenType, filters.ventilationType,
    filters.windowsMin, filters.hasLift ? 'lift' : '',
    selectedAmenities.length ? 'amenities' : '',
    filters.sortBy !== 'newest' ? 'sort' : '',
  ].filter(Boolean).length

  return {
    filters, setFilters, clearFilters,
    hasActiveFilters: activeFilterCount > 0,
    selectedAmenities, amenities, handleAmenityToggle,
    waitingForAmenities, amenitiesError, refetchAmenities,
    activeFilterCount, pageSize, setPageSize, pager, params,
  }
}
