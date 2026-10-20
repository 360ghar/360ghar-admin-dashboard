import { useMemo, useState, useCallback } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useDeletePropertyMutation, useSearchPropertiesQuery, useUpdatePropertyMutation, type Property } from '@/features/properties/api/propertiesApi'
import type { PropertyStatus } from '@/types/pm'
import { Card } from '@/components/ui/card'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { useNavigate } from 'react-router-dom'
import CursorPager from '@/components/ui/cursor-pager'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table'
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
import { scopedStorageKey } from '@/lib/storage'
import { usePropertyListQuery } from '@/features/properties/hooks/usePropertyListQuery'

const propertyRowId = (property: Property) => String(property.id)
const EMPTY_SELECTION: RowSelectionState = {}

const PropertyList = () => {
  const { user, role } = useUserRole()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const {
    filters, setFilters, clearFilters, hasActiveFilters,
    selectedAmenities, amenities, handleAmenityToggle, activeFilterCount,
    waitingForAmenities, amenitiesError, refetchAmenities,
    pageSize, setPageSize, pager, params,
  } = usePropertyListQuery(user?.supabase_user_id, role, user?.agent_id)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [selectionState, setSelectionState] = useState<{ scope: string; rows: RowSelectionState }>({ scope: '', rows: {} })
  const { toast } = useToast()

  const { currentData: data, isLoading, isFetching, error, refetch } = useSearchPropertiesQuery(params, { skip: waitingForAmenities })
  const selectionScope = `${user?.supabase_user_id ?? ''}|${JSON.stringify(params)}`
  const rawSelection = selectionState.scope === selectionScope ? selectionState.rows : EMPTY_SELECTION
  const selectedRows = useMemo(() => (data?.items ?? []).filter((row) => rawSelection[propertyRowId(row)]), [data?.items, rawSelection])
  const rowSelection = useMemo<RowSelectionState>(() => Object.fromEntries(selectedRows.map((row) => [propertyRowId(row), true])), [selectedRows])
  const updateSelection: OnChangeFn<RowSelectionState> = useCallback((updater) => {
    setSelectionState({
      scope: selectionScope,
      rows: typeof updater === 'function' ? updater(rowSelection) : updater,
    })
  }, [selectionScope, rowSelection])
  const [del] = useDeletePropertyMutation()
  const [updateProperty] = useUpdatePropertyMutation()

  const handleDelete = useCallback(async (id: number) => {
    await del(id).unwrap()
    toast({ title: 'Deleted', description: 'Property removed' })
  }, [del, toast])

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.length === 0) return
    const results = await Promise.allSettled(
      selectedRows.map((row) => del(row.id).unwrap())
    )
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length
    const failedRows = selectedRows.filter((_, index) => results[index].status === 'rejected')
    if (failedRows.length === 0) {
      toast({ title: 'Deleted', description: `${fulfilled} propert${fulfilled === 1 ? 'y' : 'ies'} removed` })
      setSelectionState({ scope: selectionScope, rows: {} })
      return
    }
    setSelectionState({ scope: selectionScope, rows: Object.fromEntries(failedRows.map((row) => [propertyRowId(row), true])) })
    throw new Error(`Could not delete property ${failedRows.map((row) => `#${row.id}`).join(', ')}. Retry the selected records.`)
  }, [del, selectedRows, selectionScope, toast])

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
            aria-label="Select all properties on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select property ${row.original.title}`}
          />
        ),
        enableSorting: false,
      },
      ...PropertyColumns({ setConfirmId, onSetStatus: (id, status) => void handleSetStatus(id, status) }),
    ],
    [handleSetStatus]
  )

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <PropertyFilters
            filters={filters satisfies PropertyFiltersState}
            setFilters={setFilters}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            selectedAmenities={selectedAmenities}
            handleAmenityToggle={handleAmenityToggle}
            amenities={amenities}
            activeFilterCount={activeFilterCount}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size) }}
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.items?.length} className="gap-2">
              <Download className="h-4 w-4" />Export current page
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-4 md:p-6">
        {waitingForAmenities && amenitiesError ? (
            <ErrorState title="Failed to load amenity filters" error={amenitiesError} onRetry={() => void refetchAmenities()} />
          ) : waitingForAmenities ? (
            <LoadingState type={isMobile ? 'cards' : 'table'} rows={5} />
          ) : isLoading || (isFetching && !data) ? (
            <LoadingState type={isMobile ? 'cards' : 'card'} rows={5} />
          ) : error && !data?.items?.length ? (
            <ErrorState
              title="Failed to load properties"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : !data?.items?.length ? (
            <EmptyState
              title="No properties found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your filters to see more results'
                  : 'Get started by creating your first property'
              }
              action={
                hasActiveFilters
                  ? { label: 'Clear Filters', onClick: clearFilters, variant: 'outline' }
                  : { label: 'Create Property', onClick: () => navigate('/properties/new') }
              }
            />
          ) : (
            <div className="space-y-4">
              {isFetching && <p role="status" className="text-sm text-muted-foreground">Updating properties…</p>}
              {error && <p role="alert" className="text-sm text-destructive">Refresh failed. Showing the last result for these filters. <Button variant="link" size="sm" onClick={() => void refetch()}>Retry</Button></p>}
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
                    onClick={() => setSelectionState({ scope: selectionScope, rows: {} })}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <ResponsiveDataTable
                columns={columns}
                data={data.items}
                enableColumnVisibility
                viewStorageKey={user?.supabase_user_id ? scopedStorageKey('properties-view', user.supabase_user_id) : 'properties-view-anonymous'}
                mobileCardRender={(property) => renderPropertyCard(property, {
                  setConfirmId,
                  selected: Boolean(rowSelection[propertyRowId(property)]),
                  onSelect: (selected) => updateSelection((previous) => {
                    const next = { ...previous }
                    if (selected) next[propertyRowId(property)] = true
                    else delete next[propertyRowId(property)]
                    return next
                  }),
                  onSetStatus: (id, status) => { void handleSetStatus(id, status) },
                })}
                enableRowSelection
                getRowId={propertyRowId}
                rowSelection={rowSelection}
                onRowSelectionChange={updateSelection}
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

      <ConfirmAlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => { if (!open) setConfirmId(null) }}
        title="Delete property?"
        description="This permanently deletes the property and its listing."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmId === null ? Promise.resolve() : handleDelete(confirmId)}
      />
    </div>
  )
}

export default PropertyList
