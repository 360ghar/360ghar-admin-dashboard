import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { api } from '@/store/api'
import authReducer from '@/features/auth/slices/authSlice'
import '@/features/pm/api/pmApi'
import { pmApi } from '@/features/pm/api/pmApi'
import type { Lease, MaintenanceRequest } from '@/types/pm'

const maintenanceItem: MaintenanceRequest = {
  id: 1,
  property_id: 10,
  owner_id: 20,
  category: 'plumbing',
  urgency: 'high',
  title: 'Leaky tap',
  request_status: 'open',
  work_order_status: null,
  created_at: '2026-01-01T00:00:00Z',
}

const leaseItem: Lease = {
  id: 1,
  property_id: 10,
  owner_id: 20,
  status: 'active',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  monthly_rent: 25000,
  security_deposit: 50000,
  grace_period_days: 5,
  payment_due_day: 5,
  created_at: '2026-01-01T00:00:00Z',
}

const terminatedLease: Lease = {
  ...leaseItem,
  status: 'terminated',
  termination_date: '2026-08-15',
  termination_reason: 'Early move-out',
}

const LIST_ARGS = { owner_id: null, limit: 50, cursor: null }

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const listResponse = () =>
  jsonResponse({ items: [maintenanceItem], next_cursor: null, has_more: false, limit: 50 })

/**
 * fetchBaseQuery passes a single `Request` object to the fetch function
 * (no `init`), so derive method + path from the request itself.
 */
const requestInfo = (input: RequestInfo | URL) => {
  const req = input instanceof Request ? input : new Request(String(input))
  return { path: new URL(req.url).pathname, method: req.method }
}

function makeStore() {
  // Mirror the real store shape: prepareHeaders reads `state.auth.token`.
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })
}

describe('pmApi optimistic updates', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies the optimistic patch immediately, then reconciles via refetch', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/maintenance/requests') && method === 'GET') return listResponse()
      if (path.endsWith('/pm/maintenance/requests/1') && method === 'PATCH') {
        return jsonResponse({ ...maintenanceItem, request_status: 'resolved' })
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listMaintenanceRequests.initiate(LIST_ARGS)).unwrap()

    const mutation = store.dispatch(
      pmApi.endpoints.updateMaintenanceRequest.initiate({
        request_id: 1,
        payload: { request_status: 'resolved' },
      }),
    )

    // onQueryStarted patches the cache synchronously — before the network settles.
    const during = pmApi.endpoints.listMaintenanceRequests.select(LIST_ARGS)(store.getState())
    expect(during.data?.items[0]?.request_status).toBe('resolved')

    await mutation.unwrap()

    // Invalidation refetches the (subscribed) list; the server still says 'open'.
    await vi.waitFor(() => {
      const after = pmApi.endpoints.listMaintenanceRequests.select(LIST_ARGS)(store.getState())
      expect(after.data?.items[0]?.request_status).toBe('open')
    })
  })

  it('undoes the optimistic patch when the mutation fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/maintenance/requests') && method === 'GET') return listResponse()
      if (path.endsWith('/pm/maintenance/requests/1') && method === 'PATCH') {
        return jsonResponse({ detail: 'boom' }, 500)
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listMaintenanceRequests.initiate(LIST_ARGS)).unwrap()

    const mutation = store.dispatch(
      pmApi.endpoints.updateMaintenanceRequest.initiate({
        request_id: 1,
        payload: { request_status: 'resolved' },
      }),
    )

    // Optimistic value visible mid-flight…
    const during = pmApi.endpoints.listMaintenanceRequests.select(LIST_ARGS)(store.getState())
    expect(during.data?.items[0]?.request_status).toBe('resolved')

    // …then rolled back on failure.
    await expect(mutation.unwrap()).rejects.toBeTruthy()
    const cached = pmApi.endpoints.listMaintenanceRequests.select(LIST_ARGS)(store.getState())
    expect(cached.data?.items[0]?.request_status).toBe('open')
  })

  it('invalidates the cached list (triggers a refetch for subscribers)', async () => {
    const getCalls: string[] = []
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/maintenance/requests') && method === 'GET') {
        getCalls.push(input instanceof Request ? input.url : String(input))
        return listResponse()
      }
      if (path.endsWith('/pm/maintenance/requests/1') && method === 'PATCH') {
        return jsonResponse({ ...maintenanceItem, request_status: 'resolved' })
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    // Subscribed query: invalidation must cause a refetch of this cache entry.
    await store.dispatch(pmApi.endpoints.listMaintenanceRequests.initiate(LIST_ARGS)).unwrap()
    expect(getCalls.length).toBe(1)

    await store
      .dispatch(
        pmApi.endpoints.updateMaintenanceRequest.initiate({
          request_id: 1,
          payload: { request_status: 'resolved' },
        }),
      )
      .unwrap()

    await vi.waitFor(() => expect(getCalls.length).toBeGreaterThanOrEqual(2))
  })

  it('does not send null cursors to the backend (sanitizeFetchArgs)', async () => {
    const urls: string[] = []
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      urls.push(input instanceof Request ? input.url : String(input))
      return listResponse()
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listMaintenanceRequests.initiate(LIST_ARGS)).unwrap()

    const getUrl = urls.find((u) => new URL(u).pathname.endsWith('/pm/maintenance/requests'))
    expect(getUrl).toBeDefined()
    expect(getUrl).not.toContain('cursor=null')
    expect(getUrl).toContain('limit=50')
  })

  it('sends vendor fields in the PATCH body and patches them optimistically', async () => {
    let patchBody: Record<string, unknown> | null = null
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/maintenance/requests') && method === 'GET') return listResponse()
      if (path.endsWith('/pm/maintenance/requests/1') && method === 'PATCH') {
        patchBody = input instanceof Request ? ((await input.clone().json()) as Record<string, unknown>) : null
        return jsonResponse({
          ...maintenanceItem,
          vendor_name: 'Plumber X',
          vendor_contact: '+91 90000 00000',
        })
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listMaintenanceRequests.initiate(LIST_ARGS)).unwrap()

    const mutation = store.dispatch(
      pmApi.endpoints.updateMaintenanceRequest.initiate({
        request_id: 1,
        payload: { vendor_name: 'Plumber X', vendor_contact: '+91 90000 00000' },
      }),
    )

    // Optimistic patch applies the vendor fields immediately.
    const during = pmApi.endpoints.listMaintenanceRequests.select(LIST_ARGS)(store.getState())
    expect(during.data?.items[0]?.vendor_name).toBe('Plumber X')
    expect(during.data?.items[0]?.vendor_contact).toBe('+91 90000 00000')

    await mutation.unwrap()

    expect(patchBody).toEqual({ vendor_name: 'Plumber X', vendor_contact: '+91 90000 00000' })
  })

  it('terminates a lease optimistically with termination fields and sends the request body', async () => {
    let terminateBody: Record<string, unknown> | null = null
    let terminated = false
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/leases/1') && method === 'GET') {
        return jsonResponse(terminated ? terminatedLease : leaseItem)
      }
      if (path.endsWith('/pm/leases/1/terminate') && method === 'POST') {
        terminated = true
        terminateBody = input instanceof Request ? ((await input.clone().json()) as Record<string, unknown>) : null
        return jsonResponse(terminatedLease)
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.getPmLease.initiate(1)).unwrap()

    const mutation = store.dispatch(
      pmApi.endpoints.terminatePmLease.initiate({
        lease_id: 1,
        body: { termination_date: '2026-08-15', reason: 'Early move-out' },
      }),
    )

    // Optimistic patch flips status + termination fields before the network settles.
    const during = pmApi.endpoints.getPmLease.select(1)(store.getState())
    expect(during.data?.status).toBe('terminated')
    expect(during.data?.termination_date).toBe('2026-08-15')
    expect(during.data?.termination_reason).toBe('Early move-out')

    await mutation.unwrap()

    expect(terminateBody).toEqual({ termination_date: '2026-08-15', reason: 'Early move-out' })

    // Invalidation refetches the (subscribed) detail; the server now returns the terminated lease.
    await vi.waitFor(() => {
      const after = pmApi.endpoints.getPmLease.select(1)(store.getState())
      expect(after.data?.status).toBe('terminated')
      expect(after.data?.termination_reason).toBe('Early move-out')
    })
  })

  it('undoes the optimistic termination patch when the mutation fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/leases/1') && method === 'GET') return jsonResponse(leaseItem)
      if (path.endsWith('/pm/leases/1/terminate') && method === 'POST') {
        return jsonResponse({ detail: 'boom' }, 500)
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.getPmLease.initiate(1)).unwrap()

    const mutation = store.dispatch(
      pmApi.endpoints.terminatePmLease.initiate({
        lease_id: 1,
        body: { reason: 'Early move-out' },
      }),
    )

    // Optimistic value visible mid-flight…
    const during = pmApi.endpoints.getPmLease.select(1)(store.getState())
    expect(during.data?.status).toBe('terminated')
    expect(during.data?.termination_reason).toBe('Early move-out')

    // …then rolled back on failure.
    await expect(mutation.unwrap()).rejects.toBeTruthy()
    const cached = pmApi.endpoints.getPmLease.select(1)(store.getState())
    expect(cached.data?.status).toBe('active')
    expect(cached.data?.termination_reason).toBeUndefined()
  })

  it('omits the terminate request body when no termination fields are provided', async () => {
    let terminateBody: string | null = null
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const { path, method } = requestInfo(input)
      if (path.endsWith('/pm/leases/1') && method === 'GET') return jsonResponse(leaseItem)
      if (path.endsWith('/pm/leases/1/terminate') && method === 'POST') {
        terminateBody = input instanceof Request ? await input.clone().text() : ''
        return jsonResponse(terminatedLease)
      }
      return jsonResponse({ detail: 'not found' }, 404)
    })

    const store = makeStore()
    await store.dispatch(pmApi.endpoints.getPmLease.initiate(1)).unwrap()

    // body omitted entirely
    await store.dispatch(pmApi.endpoints.terminatePmLease.initiate({ lease_id: 1 })).unwrap()
    expect(terminateBody).toBe('')

    // body passed but all fields empty (dialog default state) — still omitted
    await store
      .dispatch(
        pmApi.endpoints.terminatePmLease.initiate({
          lease_id: 1,
          body: { termination_date: '', reason: '' },
        }),
      )
      .unwrap()
    expect(terminateBody).toBe('')
  })
})
