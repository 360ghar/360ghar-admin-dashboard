import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentChargeWithTotals } from '@/types/pm'
import RecordPaymentDialog from '../RecordPaymentDialog'

const mocks = vi.hoisted(() => ({
  recordPayment: vi.fn(),
  uploadDocument: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useRecordRentPaymentMutation: () => [mocks.recordPayment, { isLoading: false }],
  useUploadPmDocumentMutation: () => [mocks.uploadDocument, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

const charge: RentChargeWithTotals = {
  charge: {
    id: 12,
    lease_id: 6,
    property_id: 4,
    owner_id: 3,
    billing_month: '2026-09-01',
    period_start: '2026-09-01',
    period_end: '2026-09-30',
    due_date: '2026-09-05',
    amount_due: 500,
    late_fee_assessed: 0,
    status: 'pending',
    created_at: '2026-09-01T00:00:00Z',
  },
  amount_paid_total: 0,
  amount_due_total: 500,
  outstanding: 500,
}

function PaymentHarness() {
  const [open, setOpen] = useState(true)
  return <RecordPaymentDialog ownerId={3} charge={charge} open={open} onOpenChange={setOpen} />
}

function selectReceipt(file: File) {
  const input = screen.getByRole('dialog').querySelector('input[type="file"]')
  expect(input).not.toBeNull()
  fireEvent.change(input as HTMLInputElement, { target: { files: [file] } })
}

describe('RecordPaymentDialog', () => {
  beforeEach(() => {
    mocks.recordPayment.mockReset()
    mocks.uploadDocument.mockReset()
    mocks.toast.mockReset()
    mocks.uploadDocument.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 91 }) }))
    mocks.recordPayment
      .mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('Record failed')) }))
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({}) }))
  })

  it('reuses a receipt upload when recording fails, then closes after a successful retry', async () => {
    render(<PaymentHarness />)
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } })
    selectReceipt(new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.recordPayment).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.recordPayment).toHaveBeenCalledTimes(2))
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(1)
    expect(mocks.recordPayment).toHaveBeenNthCalledWith(2, {
      charge_id: 12,
      amount_paid: 100,
      payment_method: 'cash',
      reference: undefined,
      notes: undefined,
      receipt_document_id: 91,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sends an amount above the listed balance and shows the 400 from the backend', async () => {
    // The backend balance holds a late fee that the daily job has not stored yet, so the list balance
    // is not a safe cap: the server decides.
    mocks.recordPayment.mockReset()
    mocks.recordPayment.mockImplementation(() => ({
      unwrap: () => Promise.reject({
        status: 400,
        data: { error: { code: 'BAD_REQUEST', message: 'Payment amount (600.00) exceeds outstanding balance (550.00)' } },
      }),
    }))
    render(<PaymentHarness />)
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ amount_paid: 600 })))
    expect(await screen.findByRole('alert')).toHaveTextContent('exceeds outstanding balance (550.00)')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('blocks repeat submits while the payment request is pending', async () => {
    let resolvePayment: () => void = () => undefined
    const pending = new Promise<void>((resolve) => { resolvePayment = resolve })
    mocks.recordPayment.mockReset()
    mocks.recordPayment.mockImplementation(() => ({ unwrap: () => pending }))
    render(<PaymentHarness />)
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } })
    const form = screen.getByRole('dialog').querySelector('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => expect(mocks.recordPayment).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('status')).toHaveTextContent('Recording payment')
    expect(screen.getByRole('button', { name: 'Recording…' })).toBeDisabled()
    resolvePayment()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('locks payment fields throughout receipt upload and payment recording', async () => {
    let finishUpload: (value: { id: number }) => void = () => undefined
    let finishPayment: () => void = () => undefined
    const upload = new Promise<{ id: number }>((resolve) => { finishUpload = resolve })
    const payment = new Promise<void>((resolve) => { finishPayment = resolve })
    mocks.uploadDocument.mockImplementation(() => ({ unwrap: () => upload }))
    mocks.recordPayment.mockReset()
    mocks.recordPayment.mockImplementation(() => ({ unwrap: () => payment }))

    render(<PaymentHarness />)
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } })
    selectReceipt(new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const dialog = screen.getByRole('dialog')
    const inputs = () => Array.from(dialog.querySelectorAll('input'))
    const method = dialog.querySelector('[role="combobox"]')
    expect(method).not.toBeNull()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Uploading receipt'))
    inputs().forEach((input) => expect(input).toBeDisabled())
    expect(method).toBeDisabled()

    act(() => { finishUpload({ id: 91 }) })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Recording payment'))
    inputs().forEach((input) => expect(input).toBeDisabled())
    expect(method).toBeDisabled()

    act(() => { finishPayment() })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.recordPayment).toHaveBeenCalledWith(expect.objectContaining({ amount_paid: 100 }))
  })

  it('rejects oversized and unsupported receipt files before upload', () => {
    render(<PaymentHarness />)
    const oversized = new File(['x'], 'receipt.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversized, 'size', { value: 20 * 1024 * 1024 + 1 })
    selectReceipt(oversized)
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'File too large',
      description: 'Maximum file size is 20 MB.',
      variant: 'destructive',
    })

    selectReceipt(new File(['x'], 'receipt.txt', { type: 'text/plain' }))
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Invalid file',
      description: 'Choose an image, PDF, or Word document.',
      variant: 'destructive',
    })
    expect(mocks.uploadDocument).not.toHaveBeenCalled()
  })
})
