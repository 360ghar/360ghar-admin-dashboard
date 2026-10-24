import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import type { BlogPostForm, BlogPostFormInput } from '@/lib/blogValidation'
import { BlogPostMetaForm } from '../BlogPostFormFields'

vi.mock('@/components/common/media/ImageUpload', () => ({
  default: ({ value, onChange }: { value: string[]; onChange: (images: string[]) => void }) => (
    <>
      <button onClick={() => onChange([])}>Remove cover image</button>
      <button onClick={() => onChange([...value, 'replacement.jpg'])}>Upload replacement</button>
      <span data-testid="cover-images">{value.join(',')}</span>
    </>
  ),
}))
vi.mock('@/components/ui/rich-text-editor', () => ({ default: () => null }))

function Harness() {
  const form = useForm<BlogPostFormInput, unknown, BlogPostForm>({ defaultValues: { cover_image_url: 'cover.jpg', status: 'draft', categories: [], tags: [] } })
  const [images, setImages] = useState(['cover.jpg'])
  return (
    <Form {...form}>
      <BlogPostMetaForm form={form} images={images} setImages={setImages} categoryOptions={[]} tagOptions={[]} />
    </Form>
  )
}

it('clears the submitted cover URL when the only uploaded image is removed', () => {
  render(<Harness />)
  const url = screen.getByRole('textbox', { name: 'Cover Image URL' })
  expect(url).toHaveValue('cover.jpg')
  fireEvent.click(screen.getByRole('button', { name: 'Remove cover image' }))
  expect(url).toHaveValue('')
})

it('uses the new upload as the sole cover image', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Upload replacement' }))
  expect(screen.getByRole('textbox', { name: 'Cover Image URL' })).toHaveValue('replacement.jpg')
  expect(screen.getByTestId('cover-images')).toHaveTextContent('replacement.jpg')
})
