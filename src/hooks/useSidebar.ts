import { useCallback, useEffect, useState } from 'react'
import { isRecord, readJSON, removeStored, writeJSON } from '@/lib/storage'

/** Default expanded sidebar width (px) — matches the previous fixed w-64. */
export const SIDEBAR_DEFAULT_WIDTH = 256
export const SIDEBAR_MIN_WIDTH = 224
export const SIDEBAR_MAX_WIDTH = 400
/** Width of the collapsed icon rail (px). */
export const SIDEBAR_COLLAPSED_WIDTH = 68

export interface SidebarPrefs {
  collapsed: boolean
  width: number
}

const STORAGE_KEY = 'sidebar-prefs'
const DEFAULT_PREFS: SidebarPrefs = { collapsed: false, width: SIDEBAR_DEFAULT_WIDTH }

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))

/**
 * Validate + sanitize a restored sidebar prefs payload. Non-record payloads,
 * wrong types and out-of-range widths degrade to safe defaults (following the
 * `lib/storage` failure policy used by `useFilterPersistence`).
 */
export function sanitizeSidebarPrefs(value: unknown): SidebarPrefs {
  if (!isRecord(value)) return { ...DEFAULT_PREFS }
  return {
    collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : DEFAULT_PREFS.collapsed,
    width: typeof value.width === 'number' && Number.isFinite(value.width)
      ? clampWidth(value.width)
      : DEFAULT_PREFS.width,
  }
}

const isDefaultPrefs = (prefs: SidebarPrefs) =>
  prefs.collapsed === DEFAULT_PREFS.collapsed && prefs.width === DEFAULT_PREFS.width

/**
 * Persisted sidebar layout state (collapsed rail + user width) for the desktop
 * sidebar. State is debounce-persisted to localStorage; default values remove
 * the key so storage never accumulates noise.
 */
export function useSidebar() {
  const [prefs, setPrefs] = useState<SidebarPrefs>(() =>
    sanitizeSidebarPrefs(readJSON<unknown>(STORAGE_KEY, null)),
  )

  // Debounce-persist (drag resizes fire many updates per second).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDefaultPrefs(prefs)) {
        removeStored(STORAGE_KEY)
        return
      }
      writeJSON(STORAGE_KEY, prefs)
    }, 300)
    return () => clearTimeout(timer)
  }, [prefs])

  // Cmd/Ctrl+\ toggles the rail (matches common editor/IDE shortcuts).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        // Don't hijack typing inside form fields.
        const target = e.target
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
        ) {
          return
        }
        e.preventDefault()
        setPrefs((p) => ({ ...p, collapsed: !p.collapsed }))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setPrefs((p) => ({ ...p, collapsed: !p.collapsed }))
  }, [])

  /** Clamped live resize — safe to call on every pointermove. */
  const setWidth = useCallback((width: number) => {
    setPrefs((p) => ({ ...p, width: clampWidth(width) }))
  }, [])

  const resetWidth = useCallback(() => {
    setPrefs((p) => ({ ...p, width: SIDEBAR_DEFAULT_WIDTH }))
  }, [])

  return {
    collapsed: prefs.collapsed,
    width: prefs.width,
    toggleCollapsed,
    setWidth,
    resetWidth,
  }
}
