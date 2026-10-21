import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UseFormReturn } from 'react-hook-form'
import type { BlogPostForm } from '@/lib/blogValidation'
import BlogEditor from '../BlogEditor'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  toast: vi.fn(),
  creating: false,
}))

vi.mock('@/features/blog/api/blogsApi', () => ({
  useCreateBlogPostMutation: () => [mocks.create, { isLoading: mocks.creating }],
  useListAllBlogCategoriesQuery: () => ({ data: [] }),
  useListAllBlogTagsQuery: () => ({ data: [] }),
}))
vi.mock('@/features/blog/components/BlogPostFormFields', () => ({
  BlogPostContentForm: ({ form }: { form: UseFormReturn<BlogPostForm> }) => (
    <>
      <input aria-label="Title" {...form.register('title')} />
      <textarea aria-label="Content" {...form.register('content')} />
    </>
  ),
  BlogPostMetaForm: ({ onImageUploadingChange }: { onImageUploadingChange: (uploading: boolean) => void }) => (
    <>
      <button type="button" onClick={() => onImageUploadingChange(true)}>Start upload</button>
      <button type="button" onClick={() => onImageUploadingChange(false)}>Finish upload</button>
    </>
  ),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUnsavedChanges', () => ({ useUnsavedChanges: () => vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.creating = false
})

it('waits for image upload and locks the create form until the request settles', async () => {
  let resolveCreate: (value: { id: number; slug: string }) => void = () => {}
  mocks.create.mockImplementation(() => ({ unwrap: () => new Promise<{ id: number; slug: string }>((resolve) => { resolveCreate = resolve }) }))
  const onSuccess = vi.fn()
  const view = render(<BlogEditor onSuccess={onSuccess} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'New post' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Content' }), { target: { value: 'Long enough body text' } })

  fireEvent.click(screen.getByRole('button', { name: 'Start upload' }))
  expect(screen.getByRole('button', { name: 'Create Post' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Finish upload' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create Post' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
  const form = screen.getByRole('textbox', { name: 'Title' }).closest('form') as HTMLFormElement
  expect(form.inert).toBe(true)

  mocks.creating = true
  view.rerender(<BlogEditor onSuccess={onSuccess} />)
  expect(form.querySelector('fieldset')).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Creating blog post')
  fireEvent.submit(form)
  expect(mocks.create).toHaveBeenCalledOnce()

  mocks.creating = false
  resolveCreate({ id: 9, slug: 'new-post' })
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-post'))
  await waitFor(() => expect((screen.getByRole('textbox', { name: 'Title' }).closest('form') as HTMLFormElement).inert).toBe(false))
})
