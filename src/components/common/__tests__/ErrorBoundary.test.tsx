import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ErrorBoundary from '../ErrorBoundary'

it('treats a render TypeError as a page error and permits a local retry', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  let shouldFail = true
  function Content() {
    if (shouldFail) throw new TypeError('Cannot read properties of undefined')
    return <p>Page restored</p>
  }

  try {
    render(<ErrorBoundary><Content /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('Connection problem')).not.toBeInTheDocument()
    shouldFail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(screen.getByText('Page restored')).toBeInTheDocument()
  } finally {
    consoleError.mockRestore()
  }
})
