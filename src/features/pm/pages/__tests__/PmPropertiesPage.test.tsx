import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/store/api'
import authReducer from '@/features/auth/slices/authSlice'
import pmReducer, { setSelectedOwner } from '@/features/pm/slices/pmSlice'
import '@/features/pm/api/pmApi'
import PmPropertiesPage from '../PmPropertiesPage'

vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
vi.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }))
vi.mock('@/features/pm/components/PropertyCreateDialog', () => ({ default: () => null }))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const flat = {
  id: 5,
  owner_id: 20,
  title: 'Test Flat',
  purpose: 'rent',
  property_type: 'apartment',
  monthly_rent: 20000,
  base_price: 20000,
  management_status: 'active',
  current_lease_id: null,
  payment_due_day: 1,
}

function renderPage() {
  const store = configureStore({
    reducer: { auth: authReducer, pm: pmReducer, [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })
  store.dispatch(setSelectedOwner({ id: 20, label: 'Owner #20' }))
  render(
    <Provider store={store}>
      <MemoryRouter>
        <PmPropertiesPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('PmPropertiesPage archive', () => {
  const fetchMock = vi.fn()

  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the archive dialog open with the backend message when the PATCH fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const req = input instanceof Request ? input : new Request(String(input))
      if (req.method === 'PATCH') {
        return Promise.resolve(json({ error: { code: 'BAD_REQUEST', message: 'The property has an active lease' } }, 400))
      }
      return Promise.resolve(json({ items: [flat], next_cursor: null, has_more: false, limit: 50, total: null }))
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Archive Test Flat' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

    // The request is running or failed: the dialog must still be mounted and show the reason.
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The property has an active lease')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    const patch = fetchMock.mock.calls
      .map(([input]) => (input instanceof Request ? input : new Request(String(input))))
      .find((req) => req.method === 'PATCH')
    expect(patch).toBeDefined()
    expect(new URL(patch!.url).pathname.endsWith('/pm/properties/5')).toBe(true)
    expect(JSON.parse(await patch!.clone().text())).toEqual({ management_status: 'archived' })
  })

  it('closes the dialog after a successful archive', async () => {
    let archived = false
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const req = input instanceof Request ? input : new Request(String(input))
      if (req.method === 'PATCH') {
        archived = true
        return Promise.resolve(json({ ...flat, management_status: 'archived' }))
      }
      return Promise.resolve(
        json({ items: [{ ...flat, management_status: archived ? 'archived' : 'active' }], next_cursor: null, has_more: false, limit: 50, total: null }),
      )
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Archive Test Flat' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Archive Test Flat' })).toBeDisabled())
  })
})
