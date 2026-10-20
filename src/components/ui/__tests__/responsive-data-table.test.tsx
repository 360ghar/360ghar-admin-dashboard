import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { vi } from 'vitest'
import { ResponsiveDataTable } from '../responsive-data-table'
import { writeVersionedJSON } from '@/lib/storage'

vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }))

interface RecordRow { id: number; name: string; city: string; status: string; owner: string }
const rows: RecordRow[] = [{ id: 7, name: 'Oak House', city: 'Delhi', status: 'Open', owner: 'Alex' }]

it('keeps later columns and their actions in the default mobile card', () => {
  const onRemove = vi.fn()
  const onRowClick = vi.fn()
  const columns: ColumnDef<RecordRow>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'city', header: 'City' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'owner', header: 'Owner' },
    { id: 'actions', cell: () => <button onClick={onRemove}>Remove record</button> },
  ]
  render(<ResponsiveDataTable columns={columns} data={rows} mobileView="cards" enableViewToggle={false} enableSorting onRowClick={onRowClick} />)

  expect(screen.getByText('Alex')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } })
  expect(screen.getByRole('button', { name: 'Sort descending' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove record' }))
  expect(onRemove).toHaveBeenCalledOnce()
  expect(onRowClick).not.toHaveBeenCalled()
})

it('clears controlled checkboxes using stable row IDs', () => {
  const columns: ColumnDef<RecordRow>[] = [
    {
      id: 'select',
      header: 'Select',
      cell: ({ row }) => (
        <button aria-label="Select row" aria-pressed={row.getIsSelected()} onClick={() => row.toggleSelected()}>
          Select
        </button>
      ),
    },
    { accessorKey: 'name', header: 'Name' },
  ]
  function Harness() {
    const [selection, setSelection] = useState<RowSelectionState>({})
    return (
      <>
        <button onClick={() => setSelection({})}>Clear selection</button>
        <ResponsiveDataTable columns={columns} data={rows} enableRowSelection rowSelection={selection} onRowSelectionChange={setSelection} getRowId={(row) => String(row.id)} />
      </>
    )
  }
  render(<Harness />)
  const checkbox = screen.getByRole('button', { name: 'Select row' })
  fireEvent.click(checkbox)
  expect(checkbox).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
  expect(checkbox).toHaveAttribute('aria-pressed', 'false')
})

it('keeps actions visible even if a saved column setting hides them', () => {
  localStorage.clear()
  writeVersionedJSON('test-table:columns', 1, { actions: false, city: false })
  const columns: ColumnDef<RecordRow>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'city', header: 'City' },
    { id: 'actions', header: 'Actions', cell: () => <button>Remove record</button> },
  ]
  render(<ResponsiveDataTable columns={columns} data={rows} enableColumnVisibility viewStorageKey="test-table" />)
  expect(screen.queryByRole('columnheader', { name: 'City' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove record' })).toBeInTheDocument()
})
