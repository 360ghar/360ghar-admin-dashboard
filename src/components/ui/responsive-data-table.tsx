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
} from "@tanstack/react-table"
import { Card } from './card'
import { ViewToggle, useViewMode, type ViewMode } from './view-toggle'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { useEffect } from 'react'

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
  /** Stable row ID accessor for row selection. Defaults to index if omitted. */
  getRowId?: (row: TData, index: number) => string
}

export function ResponsiveDataTable<TData, TValue>({
  columns,
  data,
  mobileCardRender,
  mobileView = 'auto',
  enableViewToggle = true,
  viewStorageKey = 'data-table',
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
}: ResponsiveDataTableProps<TData, TValue>) {
  const isMobile = useIsMobile()
  const [storedView, setStoredView] = useViewMode(viewStorageKey)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

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
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting
      ? {
          state: { sorting },
          onSortingChange: setSorting,
          getSortedRowModel: getSortedRowModel(),
          enableSortingRemoval: true,
        }
      : {}),
    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          state: { sorting, rowSelection },
          onRowSelectionChange: setRowSelection,
        }
      : {}),
  })

  useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) return
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original))
  }, [enableRowSelection, onSelectionChange, rowSelection, table])

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
                <TableHead key={header.id}>
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
                onClick={() => onRowClick?.(row.original)}
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
        onClick={() => onRowClick?.(rowData)}
      >
        <div className="space-y-2">
          {tableRow.getVisibleCells().slice(0, 4).map((cell) => {
            const header = cell.column.columnDef.header
            const headerText = typeof header === 'string' ? header : ''

            return (
              <div key={cell.id} className="flex justify-between items-start gap-2">
                {headerText && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {headerText}:
                  </span>
                )}
                <span className="text-sm text-right">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
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
      {enableViewToggle && !isMobile && (
        <div className="flex justify-end">
          <ViewToggle view={storedView} onChange={setStoredView} />
        </div>
      )}

      {/* Render based on current view */}
      {currentView === 'table' ? renderTable() : renderCards()}
    </div>
  )
}
