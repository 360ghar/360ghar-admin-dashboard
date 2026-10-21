import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SwipePage from '../SwipePage'

const mocks = vi.hoisted(() => ({ swipe: vi.fn(), toast: vi.fn() }))

vi.mock('@/features/properties/api/propertiesApi', () => ({
  useGetRecommendationsQuery: () => ({
    data: { items: [{ id: 1, title: 'First' }, { id: 2, title: 'Second' }], has_more: false, next_cursor: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/swipes/api/swipesApi', () => ({ useSwipePropertyMutation: () => [mocks.swipe] }))
vi.mock('../../components/SwipeCard', () => ({
  default: ({ property, onSwipe }: { property: { id: number; title: string }; onSwipe: (direction: 'left' | 'right') => Promise<void> }) => (
    <div>
      <span>Card {property.title}</span>
      <button type="button" onClick={() => { void onSwipe('right').catch(() => {}) }}>Like</button>
    </div>
  ),
}))
vi.mock('motion/react', () => ({ AnimatePresence: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/reactbits/FadeContent', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }))

const failWith = (code: string, status: number) => () => ({
  unwrap: () => Promise.reject({ status, data: { error: { code, message: code } } }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SwipePage', () => {
  it('moves to the next card on success and shows no match toast', async () => {
    mocks.swipe.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 1, property_id: 1, is_liked: true }) }))
    render(<SwipePage />)
    expect(screen.getByText('Card First')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Like' }))
    await screen.findByText('Card Second')
    expect(mocks.swipe).toHaveBeenCalledWith({ property_id: 1, is_liked: true })
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it('explains an own-listing swipe (403 OWN_PROPERTY_SWIPE) and moves on', async () => {
    mocks.swipe.mockImplementation(failWith('OWN_PROPERTY_SWIPE', 403))
    render(<SwipePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Like' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Your own listing' })))
    await screen.findByText('Card Second')
  })

  it('handles a removed listing (404 PROPERTY_NOT_FOUND) and moves on', async () => {
    mocks.swipe.mockImplementation(failWith('PROPERTY_NOT_FOUND', 404))
    render(<SwipePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Like' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Listing removed' })))
    await screen.findByText('Card Second')
  })

  it('keeps the card and shows the backend message for any other failure', async () => {
    mocks.swipe.mockImplementation(failWith('SERVER_BUSY', 503))
    render(<SwipePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Like' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Swipe failed', description: 'SERVER_BUSY' })))
    expect(screen.getByText('Card First')).toBeInTheDocument()
  })
})
