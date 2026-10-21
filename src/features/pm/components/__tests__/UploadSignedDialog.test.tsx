import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UploadSignedDialog from '../UploadSignedDialog'

const mocks = vi.hoisted(() => ({
  uploadDocument: vi.fn(),
  attachLease: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useUploadPmDocumentMutation: () => [mocks.uploadDocument, { isLoading: false }],
  useUploadSignedPmLeaseMutation: () => [mocks.attachLease, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

describe('UploadSignedDialog', () => {
  beforeEach(() => {
    mocks.uploadDocument.mockReset()
    mocks.attachLease.mockReset()
    mocks.toast.mockReset()
    mocks.uploadDocument.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 57 }) }))
    mocks.attachLease
      .mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('Attach failed')) }))
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({}) }))
  })

  it('retries a failed lease attachment without uploading the same file again', async () => {
    render(<UploadSignedDialog leaseId={12} ownerId={3} propertyId={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Upload signed' }))
    const input = screen.getByRole('dialog').querySelector('input[type="file"]')
    expect(input).not.toBeNull()
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['lease'], 'signed.pdf', { type: 'application/pdf' })] },
    })

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))
    await waitFor(() => expect(mocks.attachLease).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))
    await waitFor(() => expect(mocks.attachLease).toHaveBeenCalledTimes(2))
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(1)
    expect(mocks.attachLease).toHaveBeenNthCalledWith(2, {
      lease_id: 12,
      payload: { lease_document_id: 57, signed_by_owner: true, signed_by_tenant: false },
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('uploads a new document when a failed attachment is retried for another lease', async () => {
    mocks.uploadDocument.mockReset()
    mocks.uploadDocument
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({ id: 57 }) }))
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({ id: 58 }) }))

    const { rerender } = render(<UploadSignedDialog leaseId={12} ownerId={3} propertyId={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Upload signed' }))
    const input = screen.getByRole('dialog').querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['lease'], 'signed.pdf', { type: 'application/pdf' })] },
    })

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))
    await waitFor(() => expect(mocks.attachLease).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Upload$/ })).toBeEnabled())

    rerender(<UploadSignedDialog leaseId={13} ownerId={3} propertyId={4} />)
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))

    await waitFor(() => expect(mocks.attachLease).toHaveBeenCalledTimes(2))
    expect(mocks.uploadDocument).toHaveBeenCalledTimes(2)
    expect((mocks.uploadDocument.mock.calls[0][0] as FormData).get('lease_id')).toBe('12')
    expect((mocks.uploadDocument.mock.calls[1][0] as FormData).get('lease_id')).toBe('13')
    expect(mocks.attachLease).toHaveBeenNthCalledWith(2, {
      lease_id: 13,
      payload: { lease_document_id: 58, signed_by_owner: true, signed_by_tenant: false },
    })
  })

  it('locks the file input while uploading', async () => {
    let finishUpload: (value: { id: number }) => void = () => {}
    mocks.uploadDocument.mockImplementation(() => ({
      unwrap: () => new Promise<{ id: number }>((resolve) => { finishUpload = resolve }),
    }))

    render(<UploadSignedDialog leaseId={12} ownerId={3} propertyId={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Upload signed' }))
    const input = screen.getByRole('dialog').querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['lease'], 'signed.pdf', { type: 'application/pdf' })] },
    })

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))
    expect(input).toBeDisabled()
    finishUpload({ id: 57 })
    await waitFor(() => expect(mocks.attachLease).toHaveBeenCalledTimes(1))
  })

  it('rejects a non-PDF file before uploading', async () => {
    render(<UploadSignedDialog leaseId={12} ownerId={3} propertyId={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Upload signed' }))
    const input = screen.getByRole('dialog').querySelector('input[type="file"]')
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['data'], 'notes.txt', { type: 'text/plain' })] },
    })

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Invalid file',
      description: 'Choose a PDF file.',
      variant: 'destructive',
    }))
    expect(mocks.uploadDocument).not.toHaveBeenCalled()
  })
})
