import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import authReducer from '@/features/auth/slices/authSlice'
import { api } from '@/store/api'
import { coreApi } from '@/features/core/api/coreApi'
import { blogsApi } from '@/features/blog/api/blogsApi'
import { propertiesApi } from '@/features/properties/api/propertiesApi'
import { bookingsApi } from '@/features/bookings/api/bookingsApi'
import { visitsApi } from '@/features/visits/api/visitsApi'
import { swipesApi } from '@/features/swipes/api/swipesApi'
import { agentsApi } from '@/features/agents/api/agentsApi'
import { usersApi } from '@/features/users/api/usersApi'
import { flatmatesApi } from '@/features/flatmates/api/flatmatesApi'

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  })
}

const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

const requestCount = (fetchMock: ReturnType<typeof vi.fn>, method: string, path: string) =>
  fetchMock.mock.calls.filter((call: unknown[]) => {
    const request = call[0]
    return request instanceof Request && request.method === method && new URL(request.url).pathname.endsWith(path)
  }).length

describe('mutation invalidation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('refreshes active page and category lists after successful creates', async () => {
    const fetchMock = vi.fn((request: Request) => Promise.resolve(
      request.method === 'GET'
        ? json({ items: [], has_more: false, next_cursor: null })
        : json({ id: 1 }),
    ))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()

    const pages = store.dispatch(coreApi.endpoints.getPages.initiate({ limit: 20 }))
    const categories = store.dispatch(blogsApi.endpoints.getBlogCategories.initiate({ limit: 20 }))
    await Promise.all([pages, categories])

    await store.dispatch(coreApi.endpoints.createPage.initiate({ unique_name: 'new' } as never)).unwrap()
    await store.dispatch(blogsApi.endpoints.createBlogCategory.initiate({ name: 'New' } as never)).unwrap()

    await vi.waitFor(() => {
      const requests = fetchMock.mock.calls.map(([request]) => request)
      expect(requests.filter((request) => request.method === 'GET' && request.url.includes('/pages')).length).toBe(2)
      expect(requests.filter((request) => request.method === 'GET' && request.url.includes('/blog/categories')).length).toBe(2)
    })
    pages.unsubscribe()
    categories.unsubscribe()
  })

  it('refreshes property details, recommendations, availability, and pricing after a property edit', async () => {
    const fetchMock = vi.fn((request: Request) => Promise.resolve(json(
      request.url.includes('/properties/recommendations')
        ? { items: [], has_more: false, next_cursor: null }
        : { id: 7 },
    )))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const bookingArgs = { property_id: 7, check_in_date: '2026-10-01', check_out_date: '2026-10-02', guests: 1 }
    const property = store.dispatch(propertiesApi.endpoints.getProperty.initiate(7))
    const recommendations = store.dispatch(propertiesApi.endpoints.getRecommendations.initiate({ limit: 10 }))
    const availability = store.dispatch(bookingsApi.endpoints.checkAvailability.initiate({ property_id: 7, guests: 1 }))
    const pricing = store.dispatch(bookingsApi.endpoints.calculatePricing.initiate(bookingArgs))
    await Promise.all([property, recommendations, availability, pricing])

    await store.dispatch(propertiesApi.endpoints.updateProperty.initiate({ id: 7, data: { title: 'Updated' } })).unwrap()

    await vi.waitFor(() => {
      expect(requestCount(fetchMock, 'GET', '/properties/7')).toBe(2)
      expect(requestCount(fetchMock, 'GET', '/properties/recommendations')).toBe(2)
      expect(requestCount(fetchMock, 'POST', '/bookings/check-availability')).toBe(2)
      expect(requestCount(fetchMock, 'POST', '/bookings/calculate-pricing')).toBe(2)
    })
    property.unsubscribe()
    recommendations.unsubscribe()
    availability.unsubscribe()
    pricing.unsubscribe()
  })

  it('refreshes property details when a visit changes', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 7, property_id: 7 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const property = store.dispatch(propertiesApi.endpoints.getProperty.initiate(7))
    await property

    await store.dispatch(visitsApi.endpoints.scheduleVisit.initiate({
      property_id: 7,
      scheduled_date: '2026-10-01T10:00:00Z',
    })).unwrap()

    await vi.waitFor(() => expect(requestCount(fetchMock, 'GET', '/properties/7')).toBe(2))
    property.unsubscribe()
  })

  it('refreshes search after a swipe without refetching the active recommendation deck', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ items: [], has_more: false, next_cursor: null })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const search = store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ exclude_swiped: true }))
    const recommendations = store.dispatch(propertiesApi.endpoints.getRecommendations.initiate({ limit: 10 }))
    await Promise.all([search, recommendations])

    await store.dispatch(swipesApi.endpoints.swipeProperty.initiate({ property_id: 7, is_liked: true })).unwrap()

    await vi.waitFor(() => expect(requestCount(fetchMock, 'GET', '/properties')).toBe(2))
    expect(requestCount(fetchMock, 'GET', '/properties/recommendations')).toBe(1)
    search.unsubscribe()
    recommendations.unsubscribe()
  })

  it('refreshes agent detail and stats after deletion, and user detail after suspension', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 9 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const agent = store.dispatch(agentsApi.endpoints.getAgent.initiate(9))
    const stats = store.dispatch(agentsApi.endpoints.getAgentStats.initiate(9))
    const user = store.dispatch(usersApi.endpoints.getUser.initiate(9))
    await Promise.all([agent, stats, user])

    await store.dispatch(agentsApi.endpoints.deleteAgent.initiate(9)).unwrap()
    await store.dispatch(flatmatesApi.endpoints.moderateReport.initiate({
      reportId: 3,
      payload: { action: 'suspend_user' },
    })).unwrap()

    await vi.waitFor(() => {
      expect(requestCount(fetchMock, 'GET', '/agents/9')).toBe(2)
      expect(requestCount(fetchMock, 'GET', '/agents/9/stats')).toBe(2)
      expect(requestCount(fetchMock, 'GET', '/users/9')).toBe(2)
    })
    agent.unsubscribe()
    stats.unsubscribe()
    user.unsubscribe()
  })

  it('refreshes blog posts when an embedded category or tag changes', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 7, categories: [], tags: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const post = store.dispatch(blogsApi.endpoints.getBlogPost.initiate(7))
    await post

    await store.dispatch(blogsApi.endpoints.updateBlogCategory.initiate({ identifier: 3, data: { name: 'Updated' } })).unwrap()
    await vi.waitFor(() => expect(requestCount(fetchMock, 'GET', '/blog/posts/7')).toBe(2))
    await store.dispatch(blogsApi.endpoints.updateBlogTag.initiate({ identifier: 4, data: { name: 'Updated' } })).unwrap()
    await vi.waitFor(() => expect(requestCount(fetchMock, 'GET', '/blog/posts/7')).toBe(3))
    post.unsubscribe()
  })
})
