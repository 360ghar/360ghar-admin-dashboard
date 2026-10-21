import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

const message = 'Discard your unsaved changes?'
const activeForms = new Set<symbol>()
let confirmedExit = false

/** Check before actions such as logout that change the session before routing. */
export function confirmActiveUnsavedChanges(): boolean {
  if (activeForms.size === 0) return true
  return window.confirm(message)
}

/** Run one navigation the user already confirmed. Only that call skips the guard, not one made while logout waits. */
export function runConfirmedExit(navigateAway: () => void) {
  confirmedExit = true
  try {
    navigateAway()
  } finally {
    confirmedExit = false
  }
}

/** Guard browser exits, links, history navigation, and programmatic routing. */
export function useUnsavedChanges(enabled: boolean) {
  const formId = useRef(Symbol('unsaved-form'))
  const allowNext = useRef(false)
  const confirming = useRef(false)
  const blocker = useBlocker(() => enabled && !confirmedExit && !allowNext.current)

  useEffect(() => {
    const id = formId.current
    if (enabled) activeForms.add(id)
    else activeForms.delete(id)
    if (activeForms.size === 0) confirmedExit = false
    return () => {
      activeForms.delete(id)
      if (activeForms.size === 0) confirmedExit = false
    }
  }, [enabled])

  useEffect(() => {
    if (blocker.state !== 'blocked' || confirming.current) return
    confirming.current = true
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
    queueMicrotask(() => { confirming.current = false })
  }, [blocker])

  useEffect(() => {
    if (!enabled) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [enabled])

  // Successful saves navigate immediately; bypass exactly that navigation.
  return useCallback(() => {
    allowNext.current = true
    window.setTimeout(() => { allowNext.current = false }, 0)
  }, [])
}
