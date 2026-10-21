import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PrivateRoute from '../../components/PrivateRoute'
import authReducer, { setInitialized } from '../../slices/authSlice'
import { consumePostLoginDestination, peekPostLoginDestination, rememberPostLoginDestination, safePostLoginDestination } from '../postLoginDestination'

beforeEach(() => sessionStorage.clear())

it('passes a protected deep link to the login route without exposing it in the login URL', () => {
  const store = configureStore({ reducer: { auth: authReducer } })
  store.dispatch(setInitialized(true))
  function LoginLocation() {
    const location = useLocation()
    return <p>{(location.state as { from?: string } | null)?.from}</p>
  }

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/pm/owners/42?status=open#documents']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/pm/owners/:ownerId" element={<p>Private</p>} />
          </Route>
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  expect(screen.getByText('/pm/owners/42?status=open#documents')).toBeInTheDocument()
})

it('keeps only safe, short-lived destinations for OAuth', () => {
  expect(safePostLoginDestination('https://example.com')).toBe('/dashboard')
  expect(safePostLoginDestination('//example.com')).toBe('/dashboard')
  expect(safePostLoginDestination('/login')).toBe('/dashboard')

  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  try {
    rememberPostLoginDestination('/pm/properties/7?tab=documents')
    expect(peekPostLoginDestination()).toBe('/pm/properties/7?tab=documents')
    expect(consumePostLoginDestination()).toBe('/pm/properties/7?tab=documents')
    expect(peekPostLoginDestination()).toBe('/dashboard')

    rememberPostLoginDestination('/properties/8')
    now.mockReturnValue(1000 + 11 * 60 * 1000)
    expect(peekPostLoginDestination()).toBe('/dashboard')
  } finally {
    now.mockRestore()
  }
})
