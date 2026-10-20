import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { scopedStorageKey } from '@/lib/storage'
import BlogList from '../BlogList'

const account = vi.hoisted(() => ({ id: 'account-a' }))
const query = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ user: { supabase_user_id: account.id } }),
}))
vi.mock('@/hooks/useMediaQuery', () => ({ useIsMobile: () => false }))
vi.mock('@/features/blog/api/blogsApi', () => ({
  useGetBlogPostsQuery: (params: unknown) => {
    query(params)
    return {
      currentData: { items: [], has_more: false, next_cursor: null },
      isFetching: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }
  },
}))

describe('BlogList filters', () => {
  beforeEach(() => {
    localStorage.clear()
    account.id = 'account-a'
    query.mockClear()
  })

  it('restores search and status after navigation and isolates account changes', () => {
    vi.useFakeTimers()
    try {
      const key = scopedStorageKey('filters_blogs', 'account-a')
      localStorage.setItem(key, JSON.stringify({
        q: 'saved search', categoriesText: '', tagsText: '', statusFilter: 'published',
      }))
      const view = render(<MemoryRouter><BlogList /></MemoryRouter>)
      expect(screen.getByPlaceholderText('Search posts...')).toHaveValue('saved search')
      expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'saved search', status: 'published' }))

      fireEvent.change(screen.getByPlaceholderText('Search posts...'), { target: { value: 'new search' } })
      act(() => { vi.advanceTimersByTime(350) })
      expect(JSON.parse(localStorage.getItem(key) ?? '{}')).toMatchObject({
        q: 'new search', statusFilter: 'published',
      })

      view.unmount()
      const reopened = render(<MemoryRouter><BlogList /></MemoryRouter>)
      expect(screen.getByPlaceholderText('Search posts...')).toHaveValue('new search')

      account.id = 'account-b'
      reopened.rerender(<MemoryRouter><BlogList /></MemoryRouter>)
      expect(screen.getByPlaceholderText('Search posts...')).toHaveValue('')
      expect(query).toHaveBeenLastCalledWith(expect.not.objectContaining({ q: 'new search' }))
      expect(localStorage.getItem(scopedStorageKey('filters_blogs', 'account-b'))).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
