import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Wrapper for async event handlers to satisfy TypeScript's no-misused-promises rule.
 * Use this when passing async functions to event handlers like onClick, onSubmit, etc.
 * 
 * @example
 * <button onClick={handleAsync(async () => { await doSomething() })}>Click</button>
 */
export function handleAsync<T>(fn: () => Promise<T>): () => void {
  return () => { void fn() }
}

/**
 * Wrapper for async event handlers that receive an event parameter.
 * 
 * @example
 * <form onSubmit={handleAsyncEvent(async (e) => { e.preventDefault(); await submit() })}>
 */
export function handleAsyncEvent<E>(fn: (event: E) => Promise<void>): (event: E) => void {
  return (event: E) => { void fn(event) }
}

/** Initials from a display name (e.g. "Jane Doe" -> "JD"), for avatar fallbacks. */
export function getInitials(fullName: string | null | undefined, fallback = 'U'): string {
  if (!fullName) return fallback
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase()
  return initials || fallback
}

