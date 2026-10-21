import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { NetworkStatusBanner } from '../NetworkStatusBanner'

it('announces offline and reconnect states without claiming data is current', () => {
  vi.useFakeTimers()
  try {
    render(<NetworkStatusBanner />)
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByRole('status')).toHaveTextContent('Displayed data may be stale')

    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.getByRole('status')).toHaveTextContent('may still be updating')

    act(() => { vi.advanceTimersByTime(6000) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})
