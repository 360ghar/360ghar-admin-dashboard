import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table"
import { Card } from './card'
import { ViewToggle, useViewMode, type ViewMode } from './view-toggle'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { Button } from './button'
import { ArrowDown, ArrowUp, Settings2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from './dropdown-menu'
import { useColumnVisibilityPreference } from '@/hooks/useColumnVisibilityPreference'

interface ResponsiveDataTableProps<TData, TValue> {
  /** Column definitions for table view */
  columns: ColumnDef<TData, TValue>[]
  /** Data to display */
  data: TData[]
  /** Custom card renderer for mobile view. If not provided, a default card layout is used. */
  mobileCardRender?: (row: TData, index: number) => React.ReactNode
  /** Force a specific view mode. 'auto' uses mobile detection. */
  mobileView?: ViewMode | 'auto'
  /** Show view toggle button */
  enableViewToggle?: boolean
  /** Storage key for persisting view preference */
  viewStorageKey?: string
  /** Offer account-scoped column visibility controls when viewStorageKey is scoped. */
  enableColumnVisibility?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Additional class name for container */
  className?: string
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void
  /** Show loading skeleton instead of data */
  isLoading?: boolean
  /** Error object to show error state */
  error?: unknown
  /** Retry callback for error state */
  onRetry?: () => void
  /** Number of skeleton rows when loading */
  tableRows?: number
  /** Enable client-side column sorting. Default: false. */
  enableSorting?: boolean
  /** Enable row selection via TanStack Table. Parent must add a checkbox column. */
  enableRowSelection?: boolean
  /** Called with the selected rows' original data whenever selection changes. */
  onSelectionChange?: (selectedRows: TData[]) => void
  /** Stable row ID accessor for row selection. Uses an `id` field, then index, if omitted. */
  getRowId?: (row: TData, index: number) => string
  /** Controlled checkbox state. Pair with `onRowSelectionChange` to clear selection from a parent. */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
}

export function ResponsiveDataTable<TData, TValue>({
  columns,
  data,
  mobileCardRender,
  mobileView = 'auto',
  enableViewToggle = true,
  viewStorageKey = 'data-table',
  enableColumnVisibility = false,
  emptyMessage = 'No results.',
  className,
  onRowClick,
  isLoading,
  error,
  onRetry,
  tableRows = 5,
  enableSorting = false,
  enableRowSelection = false,
  onSelectionChange,
  getRowId,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
}: ResponsiveDataTableProps<TData, TValue>) {
  const isMobile = useIsMobile()
  const [storedView, setStoredView] = useViewMode(viewStorageKey)
  const [savedVisibility, setColumnVisibility] = useColumnVisibilityPreference(viewStorageKey)
  const columnVisibility = React.useMemo(() => enableColumnVisibility
    ? { ...savedVisibility, actions: true, select: true }
    : {}, [enableColumnVisibility, savedVisibility])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const defaultGetRowId = React.useCallback((row: TData, index: number) => {
    if (row && typeof row === 'object' && 'id' in row && (typeof row.id === 'string' || typeof row.id === 'number')) {
      return String(row.id)
    }
    return String(index)
  }, [])
  const rowId = getRowId ?? defaultGetRowId
  const updateRowSelection = React.useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      if (controlledRowSelection !== undefined) {
        onRowSelectionChange?.(updater)
      } else {
        setInternalRowSelection(updater)
      }
    },
    [controlledRowSelection, onRowSelectionChange],
  )

  // A selected row may leave the current page after filtering or pagination.
  // Report only rows in the current data set, using the same IDs as TanStack.
  const selectedRows = React.useMemo(() => data.filter((row, index) =>
    rowSelection[rowId(row, index)]
  ), [data, rowId, rowSelection])
  const selectionIds = React.useMemo(() => data.flatMap((row, index) =>
    rowSelection[rowId(row, index)]
      ? [rowId(row, index)]
      : []
  ).join('\u0000'), [data, rowId, rowSelection])
  const lastReportedSelection = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!enableRowSelection || !onSelectionChange || lastReportedSelection.current === selectionIds) return
    lastReportedSelection.current = selectionIds
    onSelectionChange(selectedRows)
  }, [enableRowSelection, onSelectionChange, selectedRows, selectionIds])

  React.useEffect(() => {
    if (!enableRowSelection || controlledRowSelection !== undefined) return
    const ids = new Set(data.map((row, index) => rowId(row, index)))
    setInternalRowSelection((previous) => {
      const retained = Object.fromEntries(Object.entries(previous).filter(([id]) => ids.has(id)))
      return Object.keys(retained).length === Object.keys(previous).length ? previous : retained
    })
  }, [controlledRowSelection, data, enableRowSelection, rowId])

  // Determine current view mode
  const currentView: ViewMode = React.useMemo(() => {
    if (mobileView === 'auto') {
      // On mobile, prefer cards; on desktop, use stored preference
      return isMobile ? 'cards' : storedView
    }
    return mobileView
  }, [mobileView, isMobile, storedView])

  const table = useReactTable({
    data,
    columns,
    getRowId: rowId,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, rowSelection, columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    ...(enableSorting
      ? {
          onSortingChange: setSorting,
          getSortedRowModel: getSortedRowModel(),
          enableSortingRemoval: true,
        }
      : {}),
    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          onRowSelectionChange: updateRowSelection,
        }
      : {}),
  })
  const sortableColumns = enableSorting ? table.getAllLeafColumns().filter((column) => column.getCanSort()) : []
  const hideableColumns = enableColumnVisibility
    ? table.getAllLeafColumns().filter((column) => column.getCanHide() && column.id !== 'actions' && column.id !== 'select')
    : []

  if (isLoading) {
    return <LoadingState type="table" rows={tableRows} columns={columns.length} className={className} />
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} className={className} />
  }

  // Render table view
  const renderTable = () => (
    <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-sm overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={enableSorting && header.column.getCanSort()
                    ? header.column.getIsSorted() === 'asc' ? 'ascending'
                      : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'
                    : undefined}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={(event) => {
                  if (event.target instanceof Element && event.target.closest('button,a,input,[role="checkbox"]')) return
                  onRowClick?.(row.original)
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  // Default card renderer
  const defaultCardRender = (rowData: TData, tableRow: ReturnType<typeof table.getRowModel>['rows'][number]) => {
    return (
      <Card
        className={cn(
          'p-4',
          onRowClick && 'cursor-pointer hover:bg-muted/50 transition-colors'
        )}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('button,a,input,[role="checkbox"]')) return
          onRowClick?.(rowData)
        }}
      >
        <div className="space-y-2">
          {tableRow.getVisibleCells().map((cell) => {
            const header = cell.column.columnDef.header
            const headerText = typeof header === 'string'
              ? header
              : cell.column.id === 'actions' ? 'Actions'
                : cell.column.id === 'select' ? 'Select'
                  : cell.column.id.replace(/[_-]/g, ' ')

            return (
              <div key={cell.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="shrink-0 text-sm text-muted-foreground capitalize">{headerText}:</span>
                <div className="min-w-0 text-right text-sm break-words">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    )
  }

  // Render cards view
  const renderCards = () => {
    const rows = table.getRowModel().rows
    return (
      <div className="space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <React.Fragment key={row.id}>
              {mobileCardRender ? mobileCardRender(row.original, row.index) : defaultCardRender(row.original, row)}
            </React.Fragment>
          ))
        ) : (
          <Card className="p-6 text-center text-muted-foreground">
            {emptyMessage}
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* View toggle - only show on desktop when enabled */}
      {((enableViewToggle && !isMobile) || enableSorting || (enableColumnVisibility && !isMobile)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {enableSorting && <span className="text-xs text-muted-foreground">Column sorting applies to this page.</span>}
          {enableSorting && currentView === 'cards' && sortableColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor={`${viewStorageKey}-sort`} className="text-sm">Sort by</label>
              <select
                id={`${viewStorageKey}-sort`}
                value={sorting[0]?.id ?? ''}
                onChange={(event) => setSorting(event.target.value ? [{ id: event.target.value, desc: false }] : [])}
                className="h-10 rounded-cohere-sm border border-input bg-background px-2 text-sm"
              >
                <option value="">Default order</option>
                {sortableColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id.replace(/[_-]/g, ' ')}
                  </option>
                ))}
              </select>
              {sorting.length > 0 && (
                <Button variant="outline" size="icon" aria-label={sorting[0].desc ? 'Sort ascending' : 'Sort descending'} onClick={() => setSorting([{ ...sorting[0], desc: !sorting[0].desc }])}>
                  {sorting[0].desc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              )}
            </div>
          )}
          <div className="ml-auto">
            {enableColumnVisibility && currentView === 'table' && !isMobile && hideableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Choose visible columns" className="mr-2 gap-2">
                    <Settings2 className="h-4 w-4" />Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(visible) => column.toggleVisibility(visible === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id.replace(/[_-]/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {enableViewToggle && !isMobile && (
              <ViewToggle view={storedView} onChange={setStoredView} />
            )}
          </div>
        </div>
      )}

      {/* Render based on current view */}
      {currentView === 'table' ? renderTable() : renderCards()}
    </div>
  )
}
