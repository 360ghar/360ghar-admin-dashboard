import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import authReducer from '@/features/auth/slices/authSlice'
import { api } from '@/store/api'
import { agentsApi } from '@/features/agents/api/agentsApi'
import { bookingsApi } from '@/features/bookings/api/bookingsApi'
import { usersApi } from '@/features/users/api/usersApi'
import { systemApi } from '@/features/core/api/systemApi'
import { amenitiesApi } from '@/features/core/api/amenitiesApi'
import { coreApi } from '@/features/core/api/coreApi'
import { notificationsApi } from '@/features/core/api/notificationsApi'
import { blogsApi } from '@/features/blog/api/blogsApi'
import { swipesApi } from '@/features/swipes/api/swipesApi'
import { visitsApi } from '@/features/visits/api/visitsApi'

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  })
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const page = (items: unknown[], next_cursor: string | null = null) => ({
  items, next_cursor, has_more: next_cursor !== null, limit: 100, total: null,
})

/** Method, path, query and parsed JSON body of the n-th request. */
async function sent(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const request = fetchMock.mock.calls[index][0] as Request
  const url = new URL(request.url)
  const text = await request.clone().text()
  return {
    method: request.method,
    path: url.pathname.replace('/api/v1', ''),
    query: Object.fromEntries(url.searchParams.entries()),
    body: text ? (JSON.parse(text) as unknown) : undefined,
  }
}

describe('request shapes follow the backend contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('toggles agent availability with a JSON body, not a query value', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 3, is_available: false })))
    vi.stubGlobal('fetch', fetchMock)
    await makeStore().dispatch(agentsApi.endpoints.toggleAgentAvailability.initiate({ agentId: 3, isAvailable: false })).unwrap()
    expect(await sent(fetchMock)).toEqual({ method: 'PATCH', path: '/agents/3/availability', query: {}, body: { is_available: false } })
  })

  it('checks occupancy with property and guests only (no dates)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ occupancy_ok: true, reason: null, max_occupancy: 4 })))
    vi.stubGlobal('fetch', fetchMock)
    const result = await makeStore().dispatch(bookingsApi.endpoints.checkAvailability.initiate({ property_id: 7, guests: 2 })).unwrap()
    expect(result.occupancy_ok).toBe(true)
    expect((await sent(fetchMock)).body).toEqual({ property_id: 7, guests: 2 })
  })

  it('reports a pricing error envelope as an error, not as a price', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ error: { code: 'PRICING_UNAVAILABLE', message: 'No nightly rate' } }, 400)))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const args = { property_id: 7, check_in_date: '2026-10-01T00:00:00Z', check_out_date: '2026-10-03T00:00:00Z', guests: 2 }
    const request = store.dispatch(bookingsApi.endpoints.calculatePricing.initiate(args))
    const result = await request
    expect(result.error).toMatchObject({ status: 400, data: { error: { code: 'PRICING_UNAVAILABLE' } } })
    expect(result.data).toBeUndefined()
    request.unsubscribe()
  })

  it('sends booking_id inside the cancel, payment and review bodies', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 9 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    await store.dispatch(bookingsApi.endpoints.cancelBooking.initiate({ booking_id: 9, reason: 'Guest asked' })).unwrap()
    await store.dispatch(bookingsApi.endpoints.processPayment.initiate({ booking_id: 9, payment_method: 'cash', transaction_id: 'rcpt-1', amount: 500 })).unwrap()
    await store.dispatch(bookingsApi.endpoints.addReview.initiate({ booking_id: 9, guest_rating: 4, guest_review: null })).unwrap()
    expect((await sent(fetchMock, 0)).body).toEqual({ booking_id: 9, reason: 'Guest asked' })
    expect((await sent(fetchMock, 1)).body).toEqual({ booking_id: 9, payment_method: 'cash', transaction_id: 'rcpt-1', amount: 500 })
    expect((await sent(fetchMock, 2)).body).toEqual({ booking_id: 9, guest_rating: 4, guest_review: null })
  })

  it('saves a user through the admin write and the self write with their own bodies', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 5 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    await store.dispatch(usersApi.endpoints.updateUser.initiate({ id: 5, data: { full_name: 'Asha', is_active: false } })).unwrap()
    await store.dispatch(usersApi.endpoints.updateProfile.initiate({ date_of_birth: null })).unwrap()
    expect(await sent(fetchMock, 0)).toMatchObject({ method: 'PUT', path: '/users/5', body: { full_name: 'Asha', is_active: false } })
    expect(await sent(fetchMock, 1)).toMatchObject({ method: 'PUT', path: '/users/profile', body: { date_of_birth: null } })
  })

  it('creates an app version with the required app and platform', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    await makeStore().dispatch(coreApi.endpoints.createAppUpdate.initiate({
      app: 'ghar', platform: 'ios', version: '1.2.3', build_number: 10, download_url: 'https://x.test/a', is_active: true, is_mandatory: false,
    })).unwrap()
    expect(await sent(fetchMock)).toMatchObject({ method: 'POST', path: '/versions', body: { app: 'ghar', platform: 'ios', version: '1.2.3' } })
  })

  it('sends the notification route as deep_link with a registered type_key', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ requested: 3, processed: 3, succeeded: 2 })))
    vi.stubGlobal('fetch', fetchMock)
    const result = await makeStore().dispatch(notificationsApi.endpoints.sendMarketingBroadcast.initiate({
      typeKey: 'promotion_generic', title: 'Hi', body: 'Body', deep_link: '/property/12',
    })).unwrap()
    expect(result.succeeded).toBe(2)
    expect(await sent(fetchMock)).toMatchObject({
      method: 'POST',
      path: '/notifications/marketing/broadcast',
      body: { type_key: 'promotion_generic', title: 'Hi', body: 'Body', deep_link: '/property/12' },
    })
  })

  it('opens an inbox row by its delivery id', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ delivery_id: 'd-1', read_at: '2026-10-16T00:00:00Z' })))
    vi.stubGlobal('fetch', fetchMock)
    await makeStore().dispatch(notificationsApi.endpoints.markDeliveryOpened.initiate({ deliveryId: 'd-1' })).unwrap()
    expect(await sent(fetchMock)).toMatchObject({ method: 'POST', path: '/notifications/deliveries/d-1/opened' })
  })

  it('cancels a visit with a reason and reschedules with a new_date', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 4, property_id: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    await store.dispatch(visitsApi.endpoints.cancelVisit.initiate({ visitId: 4, reason: 'Owner away' })).unwrap()
    await store.dispatch(visitsApi.endpoints.rescheduleVisit.initiate({ visitId: 4, newDate: '2026-10-20T10:00:00.000Z' })).unwrap()
    expect(await sent(fetchMock, 0)).toMatchObject({ path: '/visits/4/cancel', body: { reason: 'Owner away' } })
    expect(await sent(fetchMock, 1)).toMatchObject({ path: '/visits/4/reschedule', body: { new_date: '2026-10-20T10:00:00.000Z' } })
  })

  it('swipes with property_id and is_liked only, and reads SwipeOut', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 1, property_id: 8, is_liked: true }, 201)))
    vi.stubGlobal('fetch', fetchMock)
    const result = await makeStore().dispatch(swipesApi.endpoints.swipeProperty.initiate({ property_id: 8, is_liked: true })).unwrap()
    expect(result).toEqual({ id: 1, property_id: 8, is_liked: true })
    expect((await sent(fetchMock)).body).toEqual({ property_id: 8, is_liked: true })
  })

  it('clears blog excerpt, cover image, categories and tags with null and empty arrays', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 2, slug: 's' })))
    vi.stubGlobal('fetch', fetchMock)
    await makeStore().dispatch(blogsApi.endpoints.updateBlogPost.initiate({
      identifier: 2,
      data: { excerpt: null, cover_image_url: null, categories: [], tags: [] },
    })).unwrap()
    expect((await sent(fetchMock)).body).toEqual({ excerpt: null, cover_image_url: null, categories: [], tags: [] })
  })

  it('treats a delete as 204 with no body', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
    await makeStore().dispatch(agentsApi.endpoints.deleteAgent.initiate(3)).unwrap()
    expect(await sent(fetchMock)).toMatchObject({ method: 'DELETE', path: '/agents/3' })
  })
})

describe('lists that need every row follow next_cursor', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the whole agent workload with limit 100 and the returned cursor', async () => {
    const fetchMock = vi.fn((request: Request) => {
      const cursor = new URL(request.url).searchParams.get('cursor')
      return Promise.resolve(json(cursor === 'c2'
        ? page([{ agent_id: 21, agent_name: 'B', current_users: 1, utilization_percentage: 5, is_available: true, queue_length: 0 }])
        : page([{ agent_id: 20, agent_name: 'A', current_users: 2, utilization_percentage: 10, is_available: true, queue_length: 0 }], 'c2')))
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = makeStore()
    const request = store.dispatch(systemApi.endpoints.getWorkload.initiate())
    const result = await request
    expect(result.data?.map((row) => row.agent_id)).toEqual([20, 21])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((await sent(fetchMock, 0)).query).toEqual({ limit: '100' })
    expect((await sent(fetchMock, 1)).query).toEqual({ limit: '100', cursor: 'c2' })
    request.unsubscribe()
  })

  it('reads every amenity, not the first 20', async () => {
    const fetchMock = vi.fn((request: Request) => {
      const cursor = new URL(request.url).searchParams.get('cursor')
      return Promise.resolve(json(cursor === 'next' ? page([{ id: 2, title: 'Lift' }]) : page([{ id: 1, title: 'Gym' }], 'next')))
    })
    vi.stubGlobal('fetch', fetchMock)
    const request = makeStore().dispatch(amenitiesApi.endpoints.getAmenities.initiate())
    const result = await request
    expect(result.data?.map((amenity) => amenity.title)).toEqual(['Gym', 'Lift'])
    request.unsubscribe()
  })

  it('stops with the error when a page fails', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ error: { code: 'INVALID_CURSOR', message: 'bad' } }, 400)))
    vi.stubGlobal('fetch', fetchMock)
    const request = makeStore().dispatch(systemApi.endpoints.getWorkload.initiate())
    const result = await request
    expect(result.error).toMatchObject({ status: 400 })
    request.unsubscribe()
  })
})
