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
  type SortDirection,
  type RowSelectionState,
} from "@tanstack/react-table"
import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { type ReactNode, useEffect, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyState?: ReactNode
  tableRows?: number
  /** Enable client-side column sorting. Default: false. */
  enableSorting?: boolean
  /** Enable row selection via TanStack Table. Parent must add a checkbox column. */
  enableRowSelection?: boolean
  /** Called with the selected rows' original data whenever selection changes. */
  onSelectionChange?: (selectedRows: TData[]) => void
}

/** Render a sortable column header with direction indicator. */
export function SortableHeader({ column, children, className }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | SortDirection }; children: ReactNode; className?: string }) {
  const sorted = column.getIsSorted()
  const ariaSort = sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting()}
      className={cn('inline-flex items-center gap-1 hover:opacity-80', className)}
      aria-sort={ariaSort}
    >
      {children}
      {sorted === 'asc' ? <ArrowUp className="h-3 w-3" /> : sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
    </button>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyState,
  tableRows = 5,
  enableSorting = false,
  enableRowSelection = false,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const table = useReactTable({
    data,
    columns,
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
    return (
      <LoadingState type="table" rows={tableRows} columns={columns.length} />
    )
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (!data.length) {
    return (
      emptyState ?? (
        <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-sm">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )
    )
  }

  return (
    <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
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
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}