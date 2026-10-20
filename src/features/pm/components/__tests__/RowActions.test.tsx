import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Document, Expense, MaintenanceRequest } from '@/types/pm'
import DocumentRowActions from '../DocumentRowActions'
import ExpenseRowActions from '../ExpenseRowActions'
import MaintenanceRowActions from '../MaintenanceRowActions'

const mocks = vi.hoisted(() => ({
  updateDoc: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  uploadDoc: vi.fn(),
  updateRequest: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useUpdatePmDocumentMutation: () => [mocks.updateDoc, { isLoading: false }],
  useUpdatePmExpenseMutation: () => [mocks.updateExpense, { isLoading: false }],
  useDeletePmExpenseMutation: () => [mocks.deleteExpense, { isLoading: false }],
  useUploadPmDocumentMutation: () => [mocks.uploadDoc, { isLoading: false }],
  useUpdateMaintenanceRequestMutation: () => [mocks.updateRequest, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'agent', user: { agent_id: 5 } }) }))

const ok = (value: unknown = {}) => () => ({ unwrap: () => Promise.resolve(value) })
const fail = (message: string) => () => ({
  unwrap: () => Promise.reject({ status: 400, data: { error: { code: 'BAD_REQUEST', message } } }),
})

const doc = {
  id: 3,
  title: 'Lease scan',
  document_type: 'lease_agreement',
  shared_with_agent: true,
  shared_with_tenant: false,
  file_url: null,
} as Document

const expense = {
  id: 9,
  owner_id: 20,
  property_id: 10,
  category: 'repairs',
  amount: 500,
  expense_date: '2026-01-01',
  title: 'Plumber',
  description: 'Tap',
  notes: null,
} as Expense

const request = {
  id: 4,
  property_id: 10,
  owner_id: 20,
  title: 'Leaky tap',
  category: 'plumbing',
  urgency: 'high',
  request_status: 'open',
} as MaintenanceRequest

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  mocks.updateDoc.mockImplementation(ok())
  mocks.updateExpense.mockImplementation(ok())
  mocks.deleteExpense.mockImplementation(ok())
  mocks.updateRequest.mockImplementation(ok())
})

describe('DocumentRowActions', () => {
  it('sends only the changed key and closes the dialog', async () => {
    render(<DocumentRowActions doc={doc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '  Signed lease  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.updateDoc).toHaveBeenCalledWith({ document_id: 3, payload: { title: 'Signed lease' } }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('does not send an empty title', () => {
    render(<DocumentRowActions doc={doc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '   ' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getByText('The title cannot be empty.')).toBeInTheDocument()
  })

  it('keeps the dialog open when the update fails', async () => {
    mocks.updateDoc.mockImplementation(fail('Tenants cannot edit documents'))
    render(<DocumentRowActions doc={doc} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'New' } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Failed', variant: 'destructive' })))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the view button as disabled when the backend sent no file_url', () => {
    render(<DocumentRowActions doc={doc} />)
    expect(screen.getByRole('button', { name: 'No access' })).toBeDisabled()
  })
})

describe('ExpenseRowActions', () => {
  it('sends only the changed keys, and null for a cleared field', async () => {
    render(<ExpenseRowActions expense={expense} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '650' } })
    fireEvent.change(within(dialog).getByLabelText('Description (optional)'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.updateExpense).toHaveBeenCalledWith({ expense_id: 9, payload: { amount: 650, description: null } }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sends nothing when nothing changed', async () => {
    render(<ExpenseRowActions expense={expense} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'No changes', description: 'Nothing was changed.' }))
    expect(mocks.updateExpense).not.toHaveBeenCalled()
  })

  it('deletes after the confirm dialog, and keeps the dialog with the backend message when it fails', async () => {
    mocks.deleteExpense.mockImplementationOnce(fail('Expense is locked')).mockImplementationOnce(ok())
    render(<ExpenseRowActions expense={expense} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    expect(await within(confirm).findByRole('alert')).toHaveTextContent('Expense is locked')

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(mocks.deleteExpense).toHaveBeenCalledTimes(2))
    expect(mocks.deleteExpense).toHaveBeenLastCalledWith(9)
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Deleted', description: 'Expense deleted.' }))
  })
})

describe('MaintenanceRowActions', () => {
  it('closes the request with a PATCH of request_status after the confirm dialog', async () => {
    render(<MaintenanceRowActions request={request} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Close request' }))
    await waitFor(() =>
      expect(mocks.updateRequest).toHaveBeenCalledWith({ request_id: 4, payload: { request_status: 'closed' } }),
    )
  })

  it('keeps the confirm dialog open with the backend message when the close fails', async () => {
    mocks.updateRequest.mockImplementation(fail('Cannot close a request with an open work order'))
    render(<MaintenanceRowActions request={request} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Close request' }))
    expect(await within(confirm).findByRole('alert')).toHaveTextContent('Cannot close a request with an open work order')
  })

  it('disables Close on a closed request', () => {
    render(<MaintenanceRowActions request={{ ...request, request_status: 'closed' }} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })
})
