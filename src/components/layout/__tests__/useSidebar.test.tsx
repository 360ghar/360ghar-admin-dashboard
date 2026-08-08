import { renderHook, act } from '@testing-library/react'
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sanitizeSidebarPrefs,
  useSidebar,
} from '@/hooks/useSidebar'

const STORAGE_KEY = 'sidebar-prefs'

describe('sanitizeSidebarPrefs', () => {
  it('returns defaults for non-record payloads', () => {
    expect(sanitizeSidebarPrefs(null)).toEqual({ collapsed: false, width: SIDEBAR_DEFAULT_WIDTH })
    expect(sanitizeSidebarPrefs('nope')).toEqual({ collapsed: false, width: SIDEBAR_DEFAULT_WIDTH })
    expect(sanitizeSidebarPrefs([1, 2])).toEqual({ collapsed: false, width: SIDEBAR_DEFAULT_WIDTH })
  })

  it('falls back per-field for wrong types', () => {
    expect(sanitizeSidebarPrefs({ collapsed: 'yes', width: 300 })).toEqual({
      collapsed: false,
      width: 300,
    })
    expect(sanitizeSidebarPrefs({ collapsed: true, width: 'wide' })).toEqual({
      collapsed: true,
      width: SIDEBAR_DEFAULT_WIDTH,
    })
  })

  it('clamps out-of-range widths', () => {
    expect(sanitizeSidebarPrefs({ collapsed: false, width: 500 })).toEqual({
      collapsed: false,
      width: SIDEBAR_MAX_WIDTH,
    })
    expect(sanitizeSidebarPrefs({ collapsed: false, width: 100 })).toEqual({
      collapsed: false,
      width: SIDEBAR_MIN_WIDTH,
    })
  })
})

describe('useSidebar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default values initially', () => {
    const { result } = renderHook(() => useSidebar())

    expect(result.current.collapsed).toBe(false)
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)
  })

  it('loads persisted prefs from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed: true, width: 320 }))

    const { result } = renderHook(() => useSidebar())

    expect(result.current.collapsed).toBe(true)
    expect(result.current.width).toBe(320)
  })

  it('recovers from a corrupt payload', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')

    const { result } = renderHook(() => useSidebar())

    expect(result.current.collapsed).toBe(false)
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)
  })

  it('persists toggled collapse state (debounced)', () => {
    jest.useFakeTimers()
    try {
      const { result } = renderHook(() => useSidebar())

      act(() => {
        result.current.toggleCollapsed()
      })
      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(result.current.collapsed).toBe(true)
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{"collapsed":true,"width":256}')
    } finally {
      jest.useRealTimers()
    }
  })

  it('clamps setWidth and removes the key when back at defaults', () => {
    jest.useFakeTimers()
    try {
      const { result } = renderHook(() => useSidebar())

      act(() => {
        result.current.setWidth(1000)
      })
      act(() => {
        jest.advanceTimersByTime(300)
      })
      expect(result.current.width).toBe(SIDEBAR_MAX_WIDTH)

      act(() => {
        result.current.resetWidth()
      })
      act(() => {
        jest.advanceTimersByTime(300)
      })
      expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    } finally {
      jest.useRealTimers()
    }
  })

  it('toggles collapse with the Cmd+\\ shortcut', () => {
    const { result } = renderHook(() => useSidebar())

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '\\', metaKey: true, bubbles: true }),
      )
    })

    expect(result.current.collapsed).toBe(true)

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: '\\', metaKey: true, bubbles: true }),
      )
    })

    expect(result.current.collapsed).toBe(false)
  })

  it('ignores the shortcut while typing in a form field', () => {
    const { result } = renderHook(() => useSidebar())
    const input = document.createElement('input')
    document.body.appendChild(input)

    try {
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: '\\', metaKey: true, bubbles: true }),
        )
      })

      expect(result.current.collapsed).toBe(false)
    } finally {
      document.body.removeChild(input)
    }
  })
})
