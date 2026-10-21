import { useRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useMainContentScrollRestoration } from '../useMainContentScrollRestoration'

function Scroller({ routeKey }: { routeKey: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useMainContentScrollRestoration(routeKey, ref)
  return <div data-testid="scroller" ref={ref}><div data-testid="content" /></div>
}

describe('useMainContentScrollRestoration', () => {
  it('resets a new route and restores a revisited route', () => {
    const view = render(<Scroller routeKey="account-a:/blogs" />)
    const scroller = screen.getByTestId('scroller')

    scroller.scrollTop = 420
    fireEvent.scroll(scroller)
    view.rerender(<Scroller routeKey="account-a:/blogs/post" />)
    expect(scroller.scrollTop).toBe(0)

    scroller.scrollTop = 90
    fireEvent.scroll(scroller)
    view.rerender(<Scroller routeKey="account-a:/blogs" />)
    expect(scroller.scrollTop).toBe(420)

    view.rerender(<Scroller routeKey="account-b:/blogs" />)
    expect(scroller.scrollTop).toBe(0)
  })

  it('waits for async list content before restoring a high scroll position', async () => {
    const view = render(<Scroller routeKey="/blogs" />)
    const scroller = screen.getByTestId('scroller')
    let top = 0
    let maxTop = 500
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value: number) => { top = Math.min(value, maxTop) },
    })

    scroller.scrollTop = 400
    fireEvent.scroll(scroller)
    view.rerender(<Scroller routeKey="/blogs/post" />)
    maxTop = 100
    view.rerender(<Scroller routeKey="/blogs" />)
    expect(scroller.scrollTop).toBe(100)

    maxTop = 500
    act(() => { screen.getByTestId('content').append(document.createElement('div')) })
    await waitFor(() => expect(scroller.scrollTop).toBe(400))
  })
})
