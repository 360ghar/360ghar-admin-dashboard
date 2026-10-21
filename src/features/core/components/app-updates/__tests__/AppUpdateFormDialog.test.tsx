import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import AppUpdateFormDialog, { defaultFormData, type AppUpdateFormData } from '../AppUpdateFormDialog'
import type { AppUpdate } from '@/types/api'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), toast: vi.fn() }))

// Radix Select measures its trigger with ResizeObserver, which jsdom does not have.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/core/api/coreApi', () => ({
  useCreateAppUpdateMutation: () => [mocks.create, { isLoading: false }],
  useUpdateAppUpdateMutation: () => [mocks.update, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

function Harness({ editing }: { editing: AppUpdate | null }) {
  const [formData, setFormData] = useState<AppUpdateFormData>(
    editing
      ? { app: editing.app, platform: editing.platform, version: editing.version, build_number: String(editing.build_number), release_notes: '', download_url: editing.download_url ?? '', is_mandatory: false, is_active: true, min_supported_version: '' }
      : { ...defaultFormData },
  )
  return <AppUpdateFormDialog open onOpenChange={vi.fn()} editingUpdate={editing} formData={formData} setFormData={setFormData} onSuccess={vi.fn()} />
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
})

describe('AppUpdateFormDialog', () => {
  it('sends the required app and platform on create', async () => {
    render(<Harness editing={null} />)
    fireEvent.change(screen.getAllByPlaceholderText('1.0.0')[0], { target: { value: '2.4.0' } })
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '240' } })
    fireEvent.change(screen.getByPlaceholderText('https://example.com/app.apk'), { target: { value: 'https://example.com/app.apk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      app: 'ghar',
      platform: 'ios',
      version: '2.4.0',
      build_number: 240,
      download_url: 'https://example.com/app.apk',
      release_notes: null,
      min_supported_version: null,
    }))
  })

  it('sends app, platform, version and build_number on edit so the change is stored', async () => {
    const editing: AppUpdate = {
      id: 9, app: 'flatmates', platform: 'android', version: '1.0.0', build_number: 10, release_notes: null,
      download_url: 'https://example.com/old.apk', is_mandatory: false, is_active: true, min_supported_version: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: null,
    }
    render(<Harness editing={editing} />)
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    const request = mocks.update.mock.calls[0][0] as { id: number; data: Record<string, unknown> }
    expect(request.id).toBe(9)
    expect(request.data).toMatchObject({ app: 'flatmates', platform: 'android', version: '1.0.0', build_number: 11 })
  })

  it('rejects a version over 20 characters before it reaches the backend', async () => {
    render(<Harness editing={null} />)
    fireEvent.change(screen.getAllByPlaceholderText('1.0.0')[0], { target: { value: '1.2.3' + '0'.repeat(20) } })
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText('https://example.com/app.apk'), { target: { value: 'https://example.com/a.apk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText('Keep the version under 20 characters')
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
