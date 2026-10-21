import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { api } from '@/store/api'
import authReducer from '@/features/auth/slices/authSlice'
import '@/features/properties/api/propertiesApi'
import { propertiesApi } from '@/features/properties/api/propertiesApi'

const jsonResponse = (status: number) =>
  new Response(JSON.stringify({ detail: 'x' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })
}

describe('retry policy (runtime behaviour)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries GET 5xx up to 3 extra attempts', async () => {
    fetchMock.mockImplementation(() => jsonResponse(500))
    const store = makeStore()
    await expect(
      store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ limit: 1 })).unwrap(),
    ).rejects.toBeTruthy()
    expect(fetchMock.mock.calls.length).toBe(4)
  }, 10_000)

  it('waits for Retry-After before it retries a GET 503', async () => {
    fetchMock
      .mockImplementationOnce(() => new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Try later' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
      }))
      .mockImplementation(() => new Response(JSON.stringify({ items: [], next_cursor: null, has_more: false, limit: 1, total: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    const store = makeStore()
    const startedAt = Date.now()
    await store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ limit: 1 })).unwrap()
    expect(fetchMock.mock.calls.length).toBe(2)
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1000)
  }, 10_000)

  it('never retries GET 4xx', async () => {
    fetchMock.mockImplementation(() => jsonResponse(400))
    const store = makeStore()
    await expect(
      store.dispatch(propertiesApi.endpoints.searchProperties.initiate({ limit: 1 })).unwrap(),
    ).rejects.toBeTruthy()
    expect(fetchMock.mock.calls.length).toBe(1)
  })

  it('never retries mutations (POST 5xx)', async () => {
    fetchMock.mockImplementation(() => jsonResponse(500))
    const store = makeStore()
    await expect(
      store
        .dispatch(propertiesApi.endpoints.createProperty.initiate({ data: {} as never }))
        .unwrap(),
    ).rejects.toBeTruthy()
    expect(fetchMock.mock.calls.length).toBe(1)
  })
})
