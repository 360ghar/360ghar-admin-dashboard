import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import PageFormDialog, { type PageFormData } from '../PageFormDialog'
import type { Page } from '@/types/api'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), toast: vi.fn() }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/core/api/coreApi', () => ({
  useCreatePageMutation: () => [mocks.create, { isLoading: false }],
  useUpdatePageMutation: () => [mocks.update, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

const page: Page = {
  id: 1, unique_name: 'about', title: 'About', content: '<p>Hi</p>', format: 'html', custom_config: { show_footer: true },
  is_active: true, is_draft: false, is_private: true, created_by: 1, updated_by: 1, view_count: 0,
  created_at: '2026-01-01T00:00:00Z', updated_at: null,
}

function Harness({ editing }: { editing: Page | null }) {
  const [formData, setFormData] = useState<PageFormData>(
    editing
      ? { unique_name: editing.unique_name, title: editing.title, content: editing.content, format: editing.format, custom_config_text: JSON.stringify(editing.custom_config), is_active: true, is_draft: false, is_private: true }
      : { unique_name: '', title: '', content: '', format: 'html', custom_config_text: '', is_active: true, is_draft: false, is_private: true },
  )
  return <PageFormDialog open onOpenChange={vi.fn()} editingPage={editing} formData={formData} setFormData={setFormData} onSuccess={vi.fn()} />
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve(page) }))
})

describe('PageFormDialog', () => {
  it('clears custom_config with null when the box is emptied, and sends is_private', async () => {
    render(<Harness editing={page} />)
    fireEvent.change(screen.getByPlaceholderText('{ "show_footer": true }'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    const request = mocks.update.mock.calls[0][0] as { uniqueName: string; data: Record<string, unknown> }
    expect(request.uniqueName).toBe('about')
    expect(request.data).toMatchObject({ custom_config: null, is_private: true, format: 'html' })
  })

  it('lets an admin publish a page by clearing Private', async () => {
    render(<Harness editing={page} />)
    fireEvent.click(screen.getByLabelText('Private (hidden from the public page)'))
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
    expect((mocks.update.mock.calls[0][0] as { data: Record<string, unknown> }).data.is_private).toBe(false)
  })

  it('explains a 409 PAGE_EXISTS on the unique name field', async () => {
    mocks.create.mockImplementation(() => ({
      unwrap: () => Promise.reject({ status: 409, data: { error: { code: 'PAGE_EXISTS', message: 'Page exists' } } }),
    }))
    render(<Harness editing={null} />)
    fireEvent.change(screen.getByPlaceholderText('Enter page title'), { target: { value: 'About us' } })
    fireEvent.change(screen.getByPlaceholderText('Enter page content (supports HTML)'), { target: { value: 'Body' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText(/A page with this name already exists/)
  })

  it('rejects a custom config that is valid JSON but not an object', async () => {
    render(<Harness editing={page} />)
    fireEvent.change(screen.getByPlaceholderText('{ "show_footer": true }'), { target: { value: '[1, 2]' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))
    await screen.findByText('Must be a JSON object')
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
