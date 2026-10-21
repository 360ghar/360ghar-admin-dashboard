import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TerminateLeaseDialog from '../TerminateLeaseDialog'

const mocks = vi.hoisted(() => ({ terminate: vi.fn(), toast: vi.fn() }))

vi.mock('@/features/pm/api/pmApi', () => ({
  useTerminatePmLeaseMutation: () => [mocks.terminate, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

function openAndFill() {
  render(<TerminateLeaseDialog leaseId={6} tenantName="Asha" canTerminate />)
  fireEvent.click(screen.getByRole('button', { name: 'Terminate' }))
  const dialog = screen.getByRole('alertdialog')
  fireEvent.change(within(dialog).getByLabelText('Termination date (optional)'), { target: { value: '2026-12-31' } })
  fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: 'Early move-out' } })
  return dialog
}

describe('TerminateLeaseDialog', () => {
  beforeEach(() => {
    mocks.terminate.mockReset()
    mocks.toast.mockReset()
  })

  it('sends the date and the reason, then closes', async () => {
    mocks.terminate.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
    const dialog = openAndFill()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminate' }))

    await waitFor(() =>
      expect(mocks.terminate).toHaveBeenCalledWith({
        lease_id: 6,
        body: { termination_date: '2026-12-31', reason: 'Early move-out' },
      }),
    )
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('stays open and keeps what the user typed when the backend refuses', async () => {
    mocks.terminate.mockImplementation(() => ({
      unwrap: () => Promise.reject({ status: 400, data: { error: { code: 'BAD_REQUEST', message: 'Lease cannot be terminated' } } }),
    }))
    const dialog = openAndFill()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminate' }))

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Failed', variant: 'destructive' })))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(within(screen.getByRole('alertdialog')).getByLabelText('Reason (optional)')).toHaveValue('Early move-out')
  })
})
