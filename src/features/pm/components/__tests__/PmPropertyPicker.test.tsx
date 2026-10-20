import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PmProperty } from '@/types/pm'
import { PmPropertyPicker } from '../PmPropertyPicker'

const mocks = vi.hoisted(() => ({ args: vi.fn(), data: null as unknown }))

const property = (id: number, title: string) => ({ id, title, owner_id: 20 }) as PmProperty

vi.mock('@/features/pm/api/pmApi', () => ({
  useListPmPropertiesQuery: (args: unknown, options: { skip?: boolean }) => {
    mocks.args(args, options)
    return {
      currentData: options.skip ? undefined : mocks.data,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }
  },
}))

describe('PmPropertyPicker', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    mocks.args.mockReset()
    mocks.data = {
      items: [property(1, 'Sea View Flat'), property(2, 'Hill Villa')],
      has_more: false,
      next_cursor: null,
    }
  })

  it('reads nothing until it opens', () => {
    render(<PmPropertyPicker ownerId={20} enabled selected={null} onSelect={vi.fn()} />)
    expect(mocks.args).toHaveBeenLastCalledWith(expect.anything(), { skip: true })
  })

  it('reads nothing while the dialog around it is closed', () => {
    render(<PmPropertyPicker ownerId={20} enabled={false} selected={null} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Property' }))
    expect(mocks.args).toHaveBeenLastCalledWith(expect.anything(), { skip: true })
  })

  it('reads one page of 20 for the owner and searches on the server with q', async () => {
    render(<PmPropertyPicker ownerId={20} enabled selected={null} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Property' }))
    expect(mocks.args).toHaveBeenLastCalledWith({ owner_id: 20, q: undefined, limit: 20 }, { skip: false })

    fireEvent.change(screen.getByPlaceholderText('Search by title or address…'), { target: { value: 'villa' } })
    await waitFor(() =>
      expect(mocks.args).toHaveBeenLastCalledWith({ owner_id: 20, q: 'villa', limit: 20 }, { skip: false }),
    )
  })

  it('hands the chosen property to the parent and closes', async () => {
    const onSelect = vi.fn()
    render(<PmPropertyPicker ownerId={null} enabled selected={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Property' }))
    fireEvent.click(await screen.findByText('#2 • Hill Villa'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, owner_id: 20 }))
    await waitFor(() => expect(screen.queryByPlaceholderText('Search by title or address…')).not.toBeInTheDocument())
  })

  it('shows the chosen property on the button and clears an optional choice', async () => {
    const onSelect = vi.fn()
    render(
      <PmPropertyPicker
        ownerId={20}
        enabled
        selected={property(1, 'Sea View Flat')}
        onSelect={onSelect}
        clearLabel="Any property"
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Property' })).toHaveTextContent('#1 • Sea View Flat')
    fireEvent.click(screen.getByRole('combobox', { name: 'Property' }))
    fireEvent.click(await screen.findByText('Any property'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('says when more rows exist than one page shows', async () => {
    mocks.data = { items: [property(1, 'A')], has_more: true, next_cursor: 'c' }
    render(<PmPropertyPicker ownerId={20} enabled selected={null} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Property' }))
    expect(await screen.findByText(/Showing the first 20/)).toBeInTheDocument()
  })
})
