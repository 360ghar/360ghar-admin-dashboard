import { useLayoutEffect, useRef, type RefObject } from 'react'

/** Restore the dashboard scroller when a route is revisited during this session. */
export function useMainContentScrollRestoration(
  routeKey: string,
  scrollerRef: RefObject<HTMLElement | null>,
) {
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const savedPositions = positions.current
    const target = savedPositions.get(routeKey) ?? 0
    let pending = target > 0
    let currentTop = target
    let mutationObserver: MutationObserver | undefined
    let resizeObserver: ResizeObserver | undefined

    const stopRestoring = () => {
      pending = false
      currentTop = scroller.scrollTop
      mutationObserver?.disconnect()
      resizeObserver?.disconnect()
    }
    const trackScroll = () => {
      if (!pending) currentTop = scroller.scrollTop
    }

    const restore = () => {
      if (!pending) return
      scroller.scrollTop = target
      if (scroller.scrollTop >= target) stopRestoring()
    }

    // A new route starts at the top. A revisited route can restore its saved
    // position once its async list content gives the scroller enough height.
    scroller.scrollTop = 0
    restore()
    scroller.addEventListener('scroll', trackScroll)

    if (pending) {
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(restore)
        Array.from(scroller.children).forEach((child) => resizeObserver?.observe(child))
      }
      mutationObserver = new MutationObserver(() => {
        if (resizeObserver) {
          resizeObserver.disconnect()
          Array.from(scroller.children).forEach((child) => resizeObserver?.observe(child))
        }
        restore()
      })
      mutationObserver.observe(scroller, { childList: true, subtree: true })
      scroller.addEventListener('wheel', stopRestoring)
      scroller.addEventListener('touchstart', stopRestoring)
      scroller.addEventListener('keydown', stopRestoring)
      scroller.addEventListener('pointerdown', stopRestoring)
    }

    return () => {
      // Keep the last scroll event. Route DOM can already have changed by the
      // time this cleanup runs, which can clamp scrollTop to the new page.
      savedPositions.set(routeKey, pending ? target : currentTop)
      // Keep the in-memory history bounded during long dashboard sessions.
      if (savedPositions.size > 50) {
        const oldestKey = savedPositions.keys().next().value
        if (oldestKey) savedPositions.delete(oldestKey)
      }
      stopRestoring()
      scroller.removeEventListener('scroll', trackScroll)
      scroller.removeEventListener('wheel', stopRestoring)
      scroller.removeEventListener('touchstart', stopRestoring)
      scroller.removeEventListener('keydown', stopRestoring)
      scroller.removeEventListener('pointerdown', stopRestoring)
    }
  }, [routeKey, scrollerRef])
}
