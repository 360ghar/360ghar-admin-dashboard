import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { api } from '@/store/api'
import authReducer from '@/features/auth/slices/authSlice'
import '@/features/pm/api/pmApi'
import { pmApi } from '@/features/pm/api/pmApi'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface Seen {
  path: string
  method: string
  query: URLSearchParams
  body: unknown
}

/** fetchBaseQuery hands one `Request` to fetch. Read the method, path, query and JSON body from it. */
async function seen(input: RequestInfo | URL): Promise<Seen> {
  const req = input instanceof Request ? input : new Request(String(input))
  const url = new URL(req.url)
  const text = await req.clone().text()
  return {
    path: url.pathname.replace(/^\/api\/v1/, ''),
    method: req.method,
    query: url.searchParams,
    body: text ? (JSON.parse(text) as unknown) : null,
  }
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })
}

const page = (items: unknown[], next_cursor: string | null = null) =>
  jsonResponse({ items, next_cursor, has_more: next_cursor !== null, limit: 100, total: null })

describe('PM contract: removed routes', () => {
  it('has no client call for a DELETE route the backend does not serve', () => {
    const endpoints = pmApi.endpoints as Record<string, unknown>
    for (const name of [
      'deletePmProperty',
      'deleteMaintenanceRequest',
      'deletePmDocument',
      'deleteApplication',
      'deleteApplicationForm',
      'listRMAssignments',
      'getPmDocumentDownloadUrl',
    ]) {
      expect(endpoints[name], name).toBeUndefined()
    }
  })

  it('keeps the expense delete, which the backend serves with 204', () => {
    expect((pmApi.endpoints as Record<string, unknown>).deletePmExpense).toBeDefined()
  })
})

describe('PM contract: requests', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes an expense with DELETE and reads the 204 without a body', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return new Response(null, { status: 204 })
    })
    const store = makeStore()
    await store.dispatch(pmApi.endpoints.deletePmExpense.initiate(9)).unwrap()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ path: '/pm/expenses/9', method: 'DELETE', body: null })
  })

  it('archives a property with a PATCH of management_status (there is no DELETE)', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const call = await seen(input)
      calls.push(call)
      return jsonResponse({ id: 5, management_status: 'archived' })
    })
    const store = makeStore()
    await store
      .dispatch(pmApi.endpoints.updatePmProperty.initiate({ property_id: 5, payload: { management_status: 'archived' } }))
      .unwrap()
    expect(calls[0]).toMatchObject({ path: '/pm/properties/5', method: 'PATCH', body: { management_status: 'archived' } })
  })

  it('closes a maintenance request with a PATCH of request_status (there is no DELETE)', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return jsonResponse({ id: 2, request_status: 'closed' })
    })
    const store = makeStore()
    await store
      .dispatch(pmApi.endpoints.updateMaintenanceRequest.initiate({ request_id: 2, payload: { request_status: 'closed' } }))
      .unwrap()
    expect(calls[0]).toMatchObject({ path: '/pm/maintenance/requests/2', method: 'PATCH', body: { request_status: 'closed' } })
  })

  it('creates a managed property with every term in the body and nothing in the query', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return jsonResponse({ id: 1 }, 201)
    })
    const store = makeStore()
    const payload = {
      owner_id: 7,
      title: 'Flat',
      property_type: 'apartment',
      purpose: 'rent',
      base_price: 25000,
      monthly_rent: 25000,
      management_status: 'active',
      payment_due_day: 5,
      grace_period_days: 3,
      late_fee_policy: { type: 'fixed', amount: 500 },
    } as const
    await store.dispatch(pmApi.endpoints.createPmProperty.initiate({ ...payload })).unwrap()
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('POST')
    expect([...calls[0].query.keys()]).toEqual([])
    expect(calls[0].body).toEqual(payload)
  })

  it('sends the first day of the month and the months count to generate charges', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return jsonResponse({ created: 3, skipped: 1 })
    })
    const store = makeStore()
    const result = await store
      .dispatch(pmApi.endpoints.generateRentCharges.initiate({ owner_id: 7, start_month: '2026-10-01', months: 2 }))
      .unwrap()
    expect(result).toEqual({ created: 3, skipped: 1 })
    expect(calls[0]).toMatchObject({ path: '/pm/rent/charges/generate', method: 'POST', body: { owner_id: 7, start_month: '2026-10-01', months: 2 } })
  })

  it('sends the same date range to the income, expense and P&L reports', async () => {
    const queries: Record<string, string> = {}
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const call = await seen(input)
      queries[call.path] = call.query.toString()
      return jsonResponse({ total_income: 1, total_expenses: 1, net_income: 0 })
    })
    const store = makeStore()
    const range = { owner_id: 7, start: '2026-01-01', end: '2026-01-31' }
    await store.dispatch(pmApi.endpoints.getIncomeReport.initiate(range)).unwrap()
    await store.dispatch(pmApi.endpoints.getExpenseReport.initiate(range)).unwrap()
    await store.dispatch(pmApi.endpoints.getPnLReport.initiate(range)).unwrap()
    expect(queries['/pm/reports/income']).toBe('owner_id=7&start=2026-01-01&end=2026-01-31')
    expect(queries['/pm/reports/expenses']).toBe(queries['/pm/reports/income'])
    expect(queries['/pm/reports/pnl']).toBe(queries['/pm/reports/income'])
  })

  it('reads the rent roll as a cursor page, and every page for the export', async () => {
    const calls: Seen[] = []
    const row = (id: number) => ({ property_id: id, title: `P${id}`, occupancy: 'vacant' })
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const call = await seen(input)
      calls.push(call)
      return call.query.get('cursor') === 'c2' ? page([row(3)]) : page([row(1), row(2)], 'c2')
    })
    const store = makeStore()

    const first = await store.dispatch(pmApi.endpoints.getRentRollReport.initiate({ owner_id: 7, limit: 100 })).unwrap()
    expect(first.items.map((r) => r.property_id)).toEqual([1, 2])
    expect(first.has_more).toBe(true)

    calls.length = 0
    const all = await store.dispatch(pmApi.endpoints.getAllRentRollItems.initiate({ owner_id: 7 })).unwrap()
    expect(all.map((r) => r.property_id)).toEqual([1, 2, 3])
    expect(calls.map((c) => c.query.get('cursor'))).toEqual([null, 'c2'])
    expect(calls.every((c) => c.query.get('limit') === '100' && c.query.get('owner_id') === '7')).toBe(true)
  })

  it('searches managed properties on the server with q and a page of 20', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return page([{ id: 1 }])
    })
    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listPmProperties.initiate({ owner_id: 7, q: 'Indira', limit: 20 })).unwrap()
    expect(calls[0].path).toBe('/pm/properties')
    expect(calls[0].query.get('q')).toBe('Indira')
    expect(calls[0].query.get('limit')).toBe('20')
    expect(calls[0].query.get('owner_id')).toBe('7')
  })

  it('never sends a limit above 100', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return page([])
    })
    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listPmLeases.initiate({ owner_id: 7, limit: 200 })).unwrap()
    expect(calls[0].query.get('limit')).toBe('100')
  })

  it('filters the application inbox by form and status', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return page([])
    })
    const store = makeStore()
    await store
      .dispatch(pmApi.endpoints.listApplications.initiate({ owner_id: 7, form_id: 12, status: 'applicant', limit: 50, cursor: null }))
      .unwrap()
    expect(calls[0].path).toBe('/pm/applications')
    expect(calls[0].query.get('form_id')).toBe('12')
    expect(calls[0].query.get('status')).toBe('applicant')
    expect(calls[0].query.has('cursor')).toBe(false)
  })

  it('sends the decision with its notes', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return jsonResponse({ id: 4, status: 'rejected' })
    })
    const store = makeStore()
    await store
      .dispatch(pmApi.endpoints.decideApplication.initiate({ application_id: 4, payload: { decision: 'rejected', notes: 'Income too low' } }))
      .unwrap()
    expect(calls[0]).toMatchObject({
      path: '/pm/applications/4/decision',
      method: 'POST',
      body: { decision: 'rejected', notes: 'Income too low' },
    })
  })

  it('settles a pending payment with POST and no body', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return jsonResponse({ id: 31, status: 'settled' })
    })
    const store = makeStore()
    const result = await store.dispatch(pmApi.endpoints.settleRentPayment.initiate(31)).unwrap()
    expect(result.status).toBe('settled')
    expect(calls[0]).toMatchObject({ path: '/pm/rent/payments/31/settle', method: 'POST', body: null })
  })

  it('rejects a pending payment with DELETE and reads the 204 without a body', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return new Response(null, { status: 204 })
    })
    const store = makeStore()
    await store.dispatch(pmApi.endpoints.rejectRentPayment.initiate(31)).unwrap()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ path: '/pm/rent/payments/31', method: 'DELETE', body: null })
  })

  it('filters rent payments by status', async () => {
    const calls: Seen[] = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      calls.push(await seen(input))
      return page([])
    })
    const store = makeStore()
    await store.dispatch(pmApi.endpoints.listRentPayments.initiate({ owner_id: 7, status: 'pending' })).unwrap()
    expect(calls[0].query.get('status')).toBe('pending')
    // Declared keys only: the admin never sends as_tenant.
    expect(calls[0].query.has('as_tenant')).toBe(false)
  })
})
