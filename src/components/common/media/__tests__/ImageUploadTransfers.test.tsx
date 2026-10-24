import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import ImageUpload from '../ImageUpload'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), toast: vi.fn() }))
vi.mock('@/features/core/api/uploadApi', () => ({ useUploadFileMutation: () => [mocks.upload] }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

function deferredUpload() {
  let resolve!: (value: { public_url: string }) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<{ public_url: string }>((yes, no) => { resolve = yes; reject = no })
  const abort = vi.fn(() => reject(new Error('aborted')))
  return { request: { unwrap: () => promise, abort }, resolve, reject, abort }
}

function Harness() {
  const [images, setImages] = useState(['existing.jpg'])
  return <>
    <ImageUpload value={images} onChange={setImages} />
    <output data-testid="images">{images.join(',')}</output>
  </>
}

function selectFiles(...files: File[]) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).not.toBeNull()
  fireEvent.change(input!, { target: { files } })
}

beforeEach(() => {
  mocks.upload.mockReset()
  mocks.toast.mockReset()
})

it('keeps completed URLs when the active batch is canceled', async () => {
  const first = deferredUpload()
  const second = deferredUpload()
  mocks.upload.mockReturnValueOnce(first.request).mockReturnValueOnce(second.request)
  render(<Harness />)
  selectFiles(new File(['first'], 'first.png', { type: 'image/png' }), new File(['second'], 'second.png', { type: 'image/png' }))
  expect(mocks.upload).toHaveBeenCalledTimes(2)

  await act(async () => { first.resolve({ public_url: 'first-url.jpg' }); await Promise.resolve() })
  expect(screen.getByTestId('images')).toHaveTextContent('existing.jpg,first-url.jpg')
  expect(within(screen.getByText('first.png').closest('li')!).getByText('Uploaded')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel upload' }))
  expect(second.abort).toHaveBeenCalledOnce()
  await waitFor(() => expect(within(screen.getByText('second.png').closest('li')!).getByText('Canceled')).toBeInTheDocument())
  expect(screen.getByTestId('images')).toHaveTextContent('existing.jpg,first-url.jpg')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry second.png' })).toBeEnabled())
})

it('retries only the failed file and adds its successful URL', async () => {
  const failed = deferredUpload()
  const retried = deferredUpload()
  mocks.upload.mockReturnValueOnce(failed.request).mockReturnValueOnce(retried.request)
  render(<Harness />)
  selectFiles(new File(['image'], 'retry.png', { type: 'image/png' }))

  await act(async () => { failed.reject(new Error('network error')); await Promise.resolve() })
  expect(within(screen.getByText('retry.png').closest('li')!).getByText('Failed')).toBeInTheDocument()
  expect(screen.getByText('network error')).toBeInTheDocument()
  expect(screen.getByTestId('images')).toHaveTextContent('existing.jpg')

  fireEvent.click(screen.getByRole('button', { name: 'Retry retry.png' }))
  expect(mocks.upload).toHaveBeenCalledTimes(2)
  await act(async () => { retried.resolve({ public_url: 'retry-url.jpg' }); await Promise.resolve() })
  expect(screen.getByTestId('images')).toHaveTextContent('existing.jpg,retry-url.jpg')
  expect(within(screen.getByText('retry.png').closest('li')!).getByText('Uploaded')).toBeInTheDocument()
  expect(screen.queryByText('network error')).not.toBeInTheDocument()
})

it('aborts an active upload when the form unmounts', async () => {
  const pending = deferredUpload()
  mocks.upload.mockReturnValueOnce(pending.request)
  const view = render(<Harness />)
  selectFiles(new File(['image'], 'leaving.png', { type: 'image/png' }))
  await act(async () => { view.unmount(); await Promise.resolve() })
  expect(pending.abort).toHaveBeenCalledOnce()
})
