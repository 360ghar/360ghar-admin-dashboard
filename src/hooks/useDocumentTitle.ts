import { useEffect } from 'react'

const APP_NAME = '360 Ghar'

/**
 * Sets `document.title` while the component is mounted.
 * Pass a page label (e.g. "Properties"); the app name is appended.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const prev = document.title
    document.title = title?.trim() ? `${title.trim()} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = prev
    }
  }, [title])
}
