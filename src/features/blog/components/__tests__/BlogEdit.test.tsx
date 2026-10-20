import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { UseFormReturn } from 'react-hook-form'
import type { BlogPostForm } from '@/lib/blogValidation'
import BlogEdit from '../BlogEdit'

const fixture = vi.hoisted(() => ({
  post: {
    id: 7,
    title: 'Server title',
    slug: 'server-title',
    content: 'Body text',
    status: 'draft',
    excerpt: 'Old excerpt',
    cover_image_url: 'https://example.com/cover.jpg',
    categories: [{ id: 1, name: 'Guides', slug: 'guides' }],
    tags: [{ id: 2, name: 'Rent', slug: 'rent' }],
    created_at: '2026-09-25T08:00:00Z',
  },
  fetching: false,
  updating: false,
  update: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/blog/api/blogsApi', () => ({
  useGetBlogPostQuery: () => ({
    currentData: fixture.post,
    isFetching: fixture.fetching,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateBlogPostMutation: () => [fixture.update, { isLoading: fixture.updating }],
  useListAllBlogCategoriesQuery: () => ({ data: [] }),
  useListAllBlogTagsQuery: () => ({ data: [] }),
}))

vi.mock('@/features/blog/components/BlogPostFormFields', () => ({
  BlogPostContentForm: ({ form }: { form: UseFormReturn<BlogPostForm> }) => (
    <>
      <input aria-label="Title" {...form.register('title')} />
      <input aria-label="Excerpt" {...form.register('excerpt')} />
    </>
  ),
  BlogPostMetaForm: ({ form }: { form: UseFormReturn<BlogPostForm> }) => (
    <button
      type="button"
      onClick={() => {
        form.setValue('categories', [])
        form.setValue('tags', [])
        form.setValue('cover_image_url', '')
      }}
    >
      Clear lists
    </button>
  ),
}))

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: fixture.toast }) }))
vi.mock('@/hooks/useUnsavedChanges', () => ({ useUnsavedChanges: () => vi.fn() }))

describe('BlogEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixture.updating = false
  })

  it('preserves dirty values when the same post refreshes', async () => {
    fixture.post.title = 'Server title'
    fixture.fetching = false
    const view = render(<MemoryRouter><BlogEdit identifier="server-title" /></MemoryRouter>)
    const title = screen.getByRole('textbox', { name: 'Title' })
    await waitFor(() => expect(title).toHaveValue('Server title'))

    fireEvent.change(title, { target: { value: 'My unsaved title' } })
    expect(title).toHaveValue('My unsaved title')

    fixture.post = { ...fixture.post, title: 'New server title' }
    fixture.fetching = true
    view.rerender(<MemoryRouter><BlogEdit identifier="server-title" /></MemoryRouter>)

    expect(title).toHaveValue('My unsaved title')
    expect(screen.getByText('Checking for updates…')).toBeInTheDocument()
  })

  it('locks the form and prevents another update while a save is pending', async () => {
    fixture.post.title = 'Server title'
    fixture.post.content = 'Long enough body text'
    let resolveUpdate: (value: { slug: string }) => void = () => {}
    fixture.update.mockImplementation(() => ({ unwrap: () => new Promise<{ slug: string }>((resolve) => { resolveUpdate = resolve }) }))
    const onSuccess = vi.fn()
    const view = render(<MemoryRouter><BlogEdit identifier="server-title" onSuccess={onSuccess} /></MemoryRouter>)
    const title = screen.getByRole('textbox', { name: 'Title' })
    await waitFor(() => expect(title).toHaveValue('Server title'))
    fireEvent.change(title, { target: { value: 'Edited title' } })

    fireEvent.click(screen.getByRole('button', { name: 'Update Post' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    const form = title.closest('form') as HTMLFormElement
    expect(form.inert).toBe(true)

    fixture.updating = true
    view.rerender(<MemoryRouter><BlogEdit identifier="server-title" onSuccess={onSuccess} /></MemoryRouter>)
    expect(form.querySelector('fieldset')).toBeDisabled()
    expect(screen.getByText('Updating blog post…')).toHaveAttribute('role', 'status')
    fireEvent.submit(form)
    expect(fixture.update).toHaveBeenCalledOnce()

    fixture.updating = false
    resolveUpdate({ slug: 'edited-title' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('edited-title'))
    expect((screen.getByRole('textbox', { name: 'Title' }).closest('form') as HTMLFormElement).inert).toBe(false)
  })

  it('clears excerpt, cover image, categories and tags with null and empty arrays', async () => {
    fixture.post.title = 'Server title'
    fixture.post.content = 'Long enough body text'
    fixture.update.mockImplementation(() => ({ unwrap: () => Promise.resolve({ slug: 'server-title' }) }))
    render(<MemoryRouter><BlogEdit identifier="server-title" /></MemoryRouter>)
    const excerpt = screen.getByRole('textbox', { name: 'Excerpt' })
    await waitFor(() => expect(excerpt).toHaveValue('Old excerpt'))

    fireEvent.change(excerpt, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear lists' }))
    fireEvent.click(screen.getByRole('button', { name: 'Update Post' }))

    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    const request = fixture.update.mock.calls[0][0] as { identifier: number; data: Record<string, unknown> }
    // An omitted key keeps the stored value, so a cleared field has to be sent as null or [].
    expect(request.data).toMatchObject({ excerpt: null, cover_image_url: null, categories: [], tags: [] })
    // These reject null on the backend.
    expect(request.data.title).toBe('Server title')
    expect(request.data.status).toBe('draft')
  })
})
