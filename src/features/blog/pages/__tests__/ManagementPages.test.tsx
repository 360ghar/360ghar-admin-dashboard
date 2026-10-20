import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TagsPage from '../tags/TagsPage'
import CategoriesPage from '../categories/CategoriesPage'

// 150 rows: more than one page of 100, so only a read that follows next_cursor can return all of them.
// One stable array: a new array on every render would re-render the table without end.
const allRows = vi.hoisted(() =>
  Array.from({ length: 150 }, (_, index) => ({
    id: index + 1,
    name: `Row ${index + 1}`,
    slug: `row-${index + 1}`,
    created_at: '2026-01-01T00:00:00Z',
  })),
)
const refetch = vi.hoisted(() => vi.fn())

vi.mock('@/features/blog/api/blogsApi', () => ({
  useListAllBlogTagsQuery: () => ({ data: allRows, isFetching: false, error: undefined, refetch }),
  useListAllBlogCategoriesQuery: () => ({ data: allRows, isFetching: false, error: undefined, refetch }),
  useDeleteBlogTagMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteBlogCategoryMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))
vi.mock('../../components/tag/TagFormDialog', () => ({ default: () => null }))
vi.mock('../../components/category/CategoryFormDialog', () => ({ default: () => null }))

describe('blog tag and category pages', () => {
  it('count every tag, not the first page', () => {
    render(<MemoryRouter><TagsPage /></MemoryRouter>)
    expect(screen.getByText('150 tags total')).toBeInTheDocument()
  })

  it('count every category, not the first page', () => {
    render(<MemoryRouter><CategoriesPage /></MemoryRouter>)
    expect(screen.getByText('150 categories total')).toBeInTheDocument()
  })
})
