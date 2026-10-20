import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GenerateChargesDialog from '../GenerateChargesDialog'

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  leasesArgs: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useGenerateRentChargesMutation: () => [mocks.generate, { isLoading: false }],
  useListAllPmLeasesQuery: (args: unknown, options: unknown) => {
    mocks.leasesArgs(args, options)
    return {
      currentData: [
        { id: 1, property_id: 10, status: 'active' },
        { id: 2, property_id: 11, status: 'expiring_soon' },
        { id: 3, property_id: 12, status: 'terminated' },
      ],
      isFetching: false,
      isError: false,
    }
  },
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))

describe('GenerateChargesDialog', () => {
  beforeEach(() => {
    mocks.generate.mockReset()
    mocks.leasesArgs.mockReset()
    mocks.toast.mockReset()
    mocks.generate.mockImplementation(() => ({ unwrap: () => Promise.resolve({ created: 2, skipped: 1 }) }))
  })

  it('sends the first day of the chosen month', async () => {
    render(<GenerateChargesDialog ownerId={7} />)
    fireEvent.click(screen.getByRole('button', { name: /Generate charges/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start month'), { target: { value: '2026-10' } })
    fireEvent.change(within(dialog).getByLabelText('Months'), { target: { value: '3' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1))
    expect(mocks.generate).toHaveBeenCalledWith({ owner_id: 7, lease_id: undefined, start_month: '2026-10-01', months: 3 })
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Generated', description: 'Created 2, skipped 1.' }))
  })

  it('sends no start month when none is chosen', async () => {
    render(<GenerateChargesDialog ownerId={7} />)
    fireEvent.click(screen.getByRole('button', { name: /Generate charges/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Generate' }))
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1))
    expect(mocks.generate.mock.calls[0][0]).toMatchObject({ start_month: undefined, months: 1 })
  })

  it('reads every lease of the owner only once the dialog is open', () => {
    render(<GenerateChargesDialog ownerId={7} />)
    expect(mocks.leasesArgs).toHaveBeenLastCalledWith({ owner_id: 7 }, { skip: true })
    fireEvent.click(screen.getByRole('button', { name: /Generate charges/ }))
    expect(mocks.leasesArgs).toHaveBeenLastCalledWith({ owner_id: 7 }, { skip: false })
  })
})
