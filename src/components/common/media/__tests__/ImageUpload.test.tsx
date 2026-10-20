import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ImageUpload from '../ImageUpload'

vi.mock('@/features/core/api/uploadApi', () => ({ useUploadFileMutation: () => [vi.fn()] }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

function Harness() {
  const [images, setImages] = useState(['first.jpg', 'second.jpg'])
  const [primary, setPrimary] = useState<string | null>('first.jpg')
  return (
    <>
      <ImageUpload value={images} onChange={setImages} primary={primary} onPrimaryChange={setPrimary} />
      <output data-testid="images">{images.join(',')}</output>
      <output data-testid="primary">{primary ?? 'none'}</output>
    </>
  )
}

it('chooses a remaining image when the primary image is removed', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))
  expect(screen.getByTestId('images')).toHaveTextContent('second.jpg')
  expect(screen.getByTestId('primary')).toHaveTextContent('second.jpg')
  fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))
  expect(screen.getByTestId('primary')).toHaveTextContent('none')
})

it('reorders images with arrow keys and updates the primary image', () => {
  render(<Harness />)
  fireEvent.keyDown(screen.getByRole('button', { name: /Reorder image 2 of 2/ }), { key: 'ArrowLeft' })
  expect(screen.getByTestId('images')).toHaveTextContent('second.jpg,first.jpg')
  expect(screen.getByTestId('primary')).toHaveTextContent('second.jpg')
})
