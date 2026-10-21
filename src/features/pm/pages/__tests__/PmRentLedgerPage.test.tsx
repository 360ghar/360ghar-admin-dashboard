import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentPayment } from '@/types/pm'
import PmRentLedgerPage from '../PmRentLedgerPage'

const mocks = vi.hoisted(() => ({
  settle: vi.fn(),
  reject: vi.fn(),
  paymentsArgs: vi.fn(),
  toast: vi.fn(),
}))

const payment = (id: number, status: RentPayment['status']): RentPayment => ({
  id,
  charge_id: 40 + id,
  lease_id: 6,
  property_id: 4,
  owner_id: 20,
  paid_at: '2026-10-02T10:00:00Z',
  amount_paid: 500,
  status,
  payment_method: 'upi',
  created_at: '2026-10-02T10:00:00Z',
})
const payments = [payment(1, 'pending'), payment(2, 'settled')]

vi.mock('@/hooks/redux', () => ({ useAppSelector: () => 20 }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/CountUp', () => ({ default: ({ to }: { to: number }) => <span>{to}</span> }))
vi.mock('@/features/pm/components/OwnerScopeGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/features/pm/components/GenerateChargesDialog', () => ({ default: () => null }))
vi.mock('@/features/pm/components/RecordPaymentDialog', () => ({ default: () => null }))
vi.mock('@/features/pm/api/pmApi', () => ({
  useListRentChargesQuery: () => ({
    currentData: { items: [], has_more: false, next_cursor: null },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useListRentPaymentsQuery: (args: unknown) => {
    mocks.paymentsArgs(args)
    return {
      currentData: { items: payments, has_more: false, next_cursor: null },
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }
  },
  useSettleRentPaymentMutation: () => [mocks.settle, { isLoading: false }],
  useRejectRentPaymentMutation: () => [mocks.reject, { isLoading: false }],
}))

describe('PmRentLedgerPage pending tenant claims', () => {
  beforeAll(() => {
    // jsdom has no matchMedia. "No match" renders the desktop table.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
    // Radix Select scrolls the chosen option into view.
    Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => {
    mocks.settle.mockReset()
    mocks.reject.mockReset()
    mocks.paymentsArgs.mockReset()
    mocks.toast.mockReset()
    mocks.settle.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
    mocks.reject.mockImplementation(() => ({ unwrap: () => Promise.resolve() }))
  })

  const openPayments = () => {
    render(<PmRentLedgerPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Payments' }))
  }

  it('offers Settle and Reject on the pending claim only', () => {
    openPayments()
    // Two rows: pending (#1) and settled (#2). Only the pending row has actions.
    expect(screen.getAllByRole('button', { name: 'Settle' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Reject' })).toHaveLength(1)
    expect(screen.getByText('Charge #41 • Lease #6')).toBeInTheDocument()
    expect(screen.getByText('Charge #42 • Lease #6')).toBeInTheDocument()
  })

  it('settles the claim after the confirm dialog', async () => {
    openPayments()
    fireEvent.click(screen.getAllByRole('button', { name: 'Settle' })[0])
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Settle' }))
    await waitFor(() => expect(mocks.settle).toHaveBeenCalledWith(1))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Settled', description: 'Payment settled.' }))
    expect(mocks.reject).not.toHaveBeenCalled()
  })

  it('rejects the claim after the confirm dialog', async () => {
    openPayments()
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0])
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(1))
    expect(mocks.settle).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows the backend message when the settle fails', async () => {
    mocks.settle.mockImplementation(() => ({
      unwrap: () => Promise.reject({
        status: 400,
        data: { error: { code: 'BAD_REQUEST', message: 'Payment amount (500.00) exceeds outstanding balance (100.00)' } },
      }),
    }))
    openPayments()
    fireEvent.click(screen.getAllByRole('button', { name: 'Settle' })[0])
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Settle' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('exceeds outstanding balance (100.00)')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('reads the pending claims with the status filter', async () => {
    openPayments()
    // Radix Select opens on the keyboard (jsdom has no pointer capture).
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Payment status' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('option', { name: 'Pending' }))
    await waitFor(() =>
      expect(mocks.paymentsArgs).toHaveBeenLastCalledWith(expect.objectContaining({ owner_id: 20, status: 'pending' })),
    )
  })
})
