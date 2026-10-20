import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormValues } from '@/features/properties/validations'
import PropertyForm from '../PropertyForm'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  toast: vi.fn(),
  updating: false,
}))

vi.mock('@/features/properties/api/propertiesApi', () => ({
  useGetPropertyQuery: () => ({
    currentData: {
      id: 7,
      title: 'Original title',
      description: '',
      property_type: 'apartment',
      purpose: 'rent',
      status: 'available',
      base_price: 100,
      area_sqft: 500,
      city: 'Delhi',
      locality: 'Central',
      owner_id: 2,
      monthly_rent: 100,
      is_available: true,
      available_from: '2026-11-01',
      // `amenities[].id` is the amenity id, the value `amenity_ids` takes.
      amenities: [{ id: 3, title: 'Gym' }, { id: 5, title: 'Lift' }],
      images: [
        { image_url: 'https://example.com/first.jpg', image_category: 'other' },
        { image_url: 'https://example.com/second.jpg', image_category: 'other' },
        { image_url: 'https://example.com/plan.jpg', image_category: 'floor_plan' },
      ],
      main_image_url: 'https://example.com/first.jpg',
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }),
  useCreatePropertyMutation: () => [vi.fn(), { isLoading: false }],
  useUpdatePropertyMutation: () => [mocks.update, { isLoading: mocks.updating }],
}))
vi.mock('@/features/users/api/usersApi', () => ({ useGetUsersQuery: () => ({ data: { items: [] } }) }))
vi.mock('@/features/core/api/amenitiesApi', () => ({ useGetAmenitiesQuery: () => ({ data: [], isLoading: false }) }))
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: 'admin', user: { supabase_user_id: 'admin-1' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUnsavedChanges', () => ({ useUnsavedChanges: () => vi.fn() }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/components/reactbits/FadeContent', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../PropertyOwnerSection', () => ({ default: () => null }))
vi.mock('../PropertyAmenitiesSection', () => ({ default: () => null }))
vi.mock('../PropertyBasicInfo', () => ({
  default: ({ form, images, setPrimaryImage, onImageUploadingChange }: {
    form: UseFormReturn<PropertyFormValues>
    images: string[]
    setPrimaryImage: (url: string) => void
    onImageUploadingChange: (uploading: boolean) => void
  }) => (
    <>
      <input aria-label="Title" {...form.register('title')} />
      <button type="button" onClick={() => setPrimaryImage(images[1])}>Choose second image</button>
      <button type="button" onClick={() => onImageUploadingChange(true)}>Start upload</button>
      <button type="button" onClick={() => onImageUploadingChange(false)}>Finish upload</button>
    </>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updating = false
})

it('sends the chosen primary first and excludes preserved floor plans', async () => {
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 7 }) }))
  const onSuccess = vi.fn()
  render(<MemoryRouter><PropertyForm id={7} onSuccess={onSuccess} /></MemoryRouter>)

  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Original title'))
  fireEvent.click(screen.getByRole('button', { name: 'Choose second image' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
  const request = mocks.update.mock.calls[0][0] as unknown as { data: { main_image_url?: string; image_urls?: string[] } }
  expect(request.data).toMatchObject({
    main_image_url: 'https://example.com/second.jpg',
    image_urls: ['https://example.com/second.jpg', 'https://example.com/first.jpg'],
  })
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(7))
})

it('round-trips amenity ids and a date-only available_from, and clears emptied optional fields with null', async () => {
  mocks.update.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 7 }) }))
  render(<MemoryRouter><PropertyForm id={7} /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Original title'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())
  const request = mocks.update.mock.calls[0][0] as unknown as { id: number; data: Record<string, unknown> }
  expect(request.id).toBe(7)
  expect(request.data.amenity_ids).toEqual([3, 5])
  expect(request.data.available_from).toBe('2026-11-01')
  // The description was empty and no kitchen type is set: both go out as null so they clear.
  expect(request.data.description).toBeNull()
  expect(request.data.kitchen_type).toBeNull()
  // Never null on the fields the backend rejects null for.
  expect(request.data.title).toBe('Original title')
  expect(request.data.status).toBe('available')
  expect(request.data.is_available).toBe(true)
  expect(request.data).not.toHaveProperty('price_per_sqft')
})

it('locks editing during save and blocks submission while an image uploads', async () => {
  let resolveUpdate: (value: { id: number }) => void = () => {}
  mocks.update.mockImplementation(() => ({ unwrap: () => new Promise<{ id: number }>((resolve) => { resolveUpdate = resolve }) }))
  const view = render(<MemoryRouter><PropertyForm id={7} /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Original title'))

  fireEvent.click(screen.getByRole('button', { name: 'Start upload' }))
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Finish upload' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce())

  const form = screen.getByRole('textbox', { name: 'Title' }).closest('form') as HTMLFormElement
  expect(form.inert).toBe(true)
  mocks.updating = true
  view.rerender(<MemoryRouter><PropertyForm id={7} /></MemoryRouter>)
  expect(form.querySelector('fieldset')).toBeDisabled()

  mocks.updating = false
  resolveUpdate({ id: 7 })
  await waitFor(() => expect(form.inert).toBe(false))
})
