import { useMemo, useState, useEffect, useCallback } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useDeletePropertyMutation, useSearchPropertiesQuery, useUpdatePropertyMutation, type PropertySearchParams, type Property } from '@/features/properties/api/propertiesApi'
import type { PropertyStatus } from '@/types/pm'
import { useGetAmenitiesQuery } from '@/features/core/api/amenitiesApi'
import { Card } from '@/components/ui/card'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { useNavigate } from 'react-router-dom'
import CursorPager from '@/components/ui/cursor-pager'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'
import { PropertyColumns, renderPropertyCard } from '@/features/properties/components/PropertyColumns'
import { PropertyFilters, type PropertyFiltersState } from '@/features/properties/components/PropertyFilters'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { downloadCsv, csvFilename } from '@/lib/csv'

const PropertyList = () => {
  const { user, role } = useUserRole()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Filter persistence - add new fields
  const { filters, setFilters, clearFilters, hasActiveFilters } = useFilterPersistence({
    key: 'properties',
    defaultValue: {
      q: '',
      city: '',
      locality: '',
      propertyType: '',
      purpose: '',
      status: '',
      priceMin: '',
      priceMax: '',
      bedroomsMin: '',
      bedroomsMax: '',
      amenities: [] as number[],
      radius: '',
      sortBy: 'newest',
      showFilters: false
    }
  })

  const [selectedAmenities, setSelectedAmenities] = useState<number[]>(filters.amenities || [])

  useEffect(() => {
    setFilters({ amenities: selectedAmenities })
  }, [selectedAmenities, setFilters])

  const { data: amenitiesData } = useGetAmenitiesQuery()

  const amenities = useMemo(() => amenitiesData || [], [amenitiesData])

  const handleAmenityToggle = (amenityId: number) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    )
  }

  // clearFilters only resets persisted filter state; amenities live in local state that
  // re-writes into filters via the effect above — clear both or amenities stick.
  const handleClearFilters = useCallback(() => {
    clearFilters()
    setSelectedAmenities([])
  }, [clearFilters])

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<Property[]>([])
  const { toast } = useToast()
  const [pageSize, setPageSize] = useState(20)

  // Debounced search terms (must be declared before pager resetKey)
  const dq = useDebounce(filters.q, 300)
  const dcity = useDebounce(filters.city, 300)
  const dlocality = useDebounce(filters.locality, 300)

  const pager = useCursorPagination(
    [
      dq, dcity, dlocality,
      filters.propertyType, filters.purpose, filters.status,
      filters.priceMin, filters.priceMax,
      filters.bedroomsMin, filters.bedroomsMax,
      selectedAmenities.join(','), filters.radius,
      filters.sortBy, pageSize,
    ].join('|'),
  )

  const params = useMemo((): PropertySearchParams => {
    const base: PropertySearchParams = {
      cursor: pager.cursor,
      limit: pageSize,
      sort_by: filters.sortBy,
    }

    if (dq) base.q = dq
    if (dcity) base.city = dcity
    if (dlocality) base.locality = dlocality
    if (filters.propertyType) base.property_type = [filters.propertyType]
    if (filters.purpose) base.purpose = filters.purpose
    if (filters.status) base.status = filters.status
    if (filters.priceMin !== '' && !Number.isNaN(Number(filters.priceMin))) base.price_min = Number(filters.priceMin)
    if (filters.priceMax !== '' && !Number.isNaN(Number(filters.priceMax))) base.price_max = Number(filters.priceMax)
    if (filters.bedroomsMin !== '' && !Number.isNaN(Number(filters.bedroomsMin))) base.bedrooms_min = Number(filters.bedroomsMin)
    if (filters.bedroomsMax !== '' && !Number.isNaN(Number(filters.bedroomsMax))) base.bedrooms_max = Number(filters.bedroomsMax)
    if (selectedAmenities.length > 0) {
      const selectedAmenityTitles = selectedAmenities
        .map((amenityId) => amenities.find((amenity) => amenity.id === amenityId))
        .map((amenity) => amenity?.title || amenity?.name)
        .filter((value): value is string => Boolean(value))
      if (selectedAmenityTitles.length > 0) {
        base.amenities = selectedAmenityTitles
      }
    }
    if (filters.radius !== '' && !Number.isNaN(Number(filters.radius))) base.radius = Number(filters.radius)

    if (role === 'agent' && user?.agent_id) base.exclude_swiped = false

    return base
  }, [
    pager.cursor,
    pageSize,
    filters.sortBy,
    dq,
    dcity,
    dlocality,
    filters.propertyType,
    filters.purpose,
    filters.status,
    filters.priceMin,
    filters.priceMax,
    filters.bedroomsMin,
    filters.bedroomsMax,
    selectedAmenities,
    amenities,
    filters.radius,
    role,
    user?.agent_id
  ])

  const { data, isFetching, error, refetch } = useSearchPropertiesQuery(params)
  const [del] = useDeletePropertyMutation()
  const [updateProperty] = useUpdatePropertyMutation()

  const handleDelete = useCallback(async (id: number) => {
    try {
      await del(id).unwrap()
      toast({ title: 'Deleted', description: 'Property removed' })
      setConfirmId(null)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }, [del, toast])

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.length === 0) return
    const results = await Promise.allSettled(
      selectedRows.map((row) => del(row.id).unwrap())
    )
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length
    const rejected = results.length - fulfilled
    if (rejected === 0) {
      toast({ title: 'Deleted', description: `${fulfilled} propert${fulfilled === 1 ? 'y' : 'ies'} removed` })
    } else if (fulfilled === 0) {
      toast({ title: 'Failed', description: `Could not delete ${rejected} propert${rejected === 1 ? 'y' : 'ies'}`, variant: 'destructive' })
    } else {
      toast({ title: 'Partial success', description: `${fulfilled} deleted, ${rejected} failed`, variant: 'destructive' })
    }
    setSelectedRows([])
  }, [del, selectedRows, toast])

  const handleSetStatus = useCallback(async (id: number, status: PropertyStatus) => {
    try {
      await updateProperty({ id, data: { status, is_available: status === 'available' } }).unwrap()
      toast({ title: 'Status updated', description: `Property #${id} marked ${status.replace(/_/g, ' ')}.` })
    } catch (e: unknown) {
      toast({ title: 'Update failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }, [updateProperty, toast])

  const handleExport = () => {
    const rows = (data?.items ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      property_type: p.property_type,
      purpose: p.purpose,
      status: p.status,
      base_price: p.base_price,
      city: p.city,
      locality: p.locality,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      created_at: p.created_at,
    }))
    downloadCsv(csvFilename('properties'), rows)
  }

  const columns = useMemo<ColumnDef<Property>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      ...PropertyColumns({ setConfirmId, onSetStatus: (id, status) => void handleSetStatus(id, status) }),
    ],
    [handleSetStatus]
  )

  // Count active filters
  const activeFilterCount = [
    filters.city,
    filters.locality,
    filters.propertyType,
    filters.purpose,
    filters.status,
    filters.priceMin,
    filters.priceMax,
    filters.bedroomsMin,
    filters.bedroomsMax,
    filters.radius,
    selectedAmenities.length > 0 ? 'amenities' : '',
  ].filter(Boolean).length

  // Amenities can be active even when other defaults match after a partial clear.
  const filtersActive = hasActiveFilters || selectedAmenities.length > 0

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <PropertyFilters
            filters={filters as unknown as PropertyFiltersState}
            setFilters={(patch) => setFilters(patch as Partial<typeof filters>)}
            clearFilters={handleClearFilters}
            hasActiveFilters={filtersActive}
            selectedAmenities={selectedAmenities}
            handleAmenityToggle={handleAmenityToggle}
            amenities={amenities}
            activeFilterCount={activeFilterCount}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size) }}
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isFetching} className="gap-2">
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-4 md:p-6">
        {isFetching ? (
            <LoadingState type={isMobile ? 'cards' : 'card'} rows={5} />
          ) : error ? (
            <ErrorState
              title="Failed to load properties"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : !data?.items?.length ? (
            <EmptyState
              title="No properties found"
              description={
                filtersActive
                  ? 'Try adjusting your filters to see more results'
                  : 'Get started by creating your first property'
              }
              action={
                filtersActive
                  ? { label: 'Clear Filters', onClick: handleClearFilters, variant: 'outline' }
                  : { label: 'Create Property', onClick: () => navigate('/properties/new') }
              }
            />
          ) : (
            <div className="space-y-4">
              {selectedRows.length > 0 && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-cohere-md border border-cohere-card-border bg-card/60 p-3 backdrop-blur-md">
                  <span className="text-sm font-medium">
                    {selectedRows.length} selected
                  </span>
                  <ConfirmAlertDialog
                    title="Delete selected properties?"
                    description={`This will permanently delete ${selectedRows.length} propert${selectedRows.length === 1 ? 'y' : 'ies'}. This action cannot be undone.`}
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={handleBulkDelete}
                  >
                    {(openDialog) => (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={openDialog}
                        disabled={isFetching}
                      >
                        Delete Selected
                      </Button>
                    )}
                  </ConfirmAlertDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRows([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <ResponsiveDataTable
                columns={columns}
                data={data.items}
                mobileCardRender={(property) => renderPropertyCard(property, setConfirmId)}
                enableSorting
                enableRowSelection
                onSelectionChange={setSelectedRows}
              />
              <CursorPager
                canPrev={pager.canPrev}
                hasMore={data.has_more}
                nextCursor={data.next_cursor}
                loading={isFetching}
                onPrev={pager.prev}
                onNext={() => pager.next(data.next_cursor)}
              />
            </div>
          )}
        </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) {
                  void handleDelete(confirmId)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PropertyList
