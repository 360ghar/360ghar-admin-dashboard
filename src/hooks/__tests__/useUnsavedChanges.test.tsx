import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { confirmActiveUnsavedChanges, useUnsavedChanges } from '../useUnsavedChanges'

function Form() {
  const [dirty, setDirty] = useState(false)
  const navigate = useNavigate()
  const allowSavedNavigation = useUnsavedChanges(dirty)
  return (
    <>
      <button onClick={() => setDirty(true)}>Edit</button>
      <button onClick={() => navigate('/next')}>Go to next page</button>
      <button onClick={() => { allowSavedNavigation(); navigate('/next') }}>Save and continue</button>
    </>
  )
}

function renderRouter(initialEntries = ['/form'], initialIndex?: number) {
  const router = createMemoryRouter([
    { path: '/form', element: <Form /> },
    { path: '/next', element: <p>Next page</p> },
  ], { initialEntries, initialIndex })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => vi.restoreAllMocks())

it('blocks programmatic navigation until dirty edits are confirmed', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = renderRouter()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce())
  expect(router.state.location.pathname).toBe('/form')

  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/next'))
})

it('blocks browser history navigation while the form is dirty', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = renderRouter(['/next', '/form'], 1)
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  await act(async () => { await router.navigate(-1) })
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce())
  expect(router.state.location.pathname).toBe('/form')

  confirm.mockReturnValue(true)
  await act(async () => { await router.navigate(-1) })
  await waitFor(() => expect(router.state.location.pathname).toBe('/next'))
})

it('checks unsaved edits before logout and permits navigation after save', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = renderRouter()
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  expect(confirmActiveUnsavedChanges()).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/next'))
  expect(confirm).toHaveBeenCalledOnce()
})
