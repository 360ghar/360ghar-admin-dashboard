/**
 * API error helpers.
 *
 * The backend sends one error body for every non-2xx response:
 *   { "error": { "code": string, "message": string, "details": object } }
 * A 422 carries the field errors in `details.fields`:
 *   [{ "field": "body.price", "msg": "...", "type": "..." }]
 * Nothing else is read. There is no `detail` array and no `errors` map.
 */
import type { ErrorEnvelope, ValidationFieldError } from '@/types/api'

/** The `error` object of the envelope. `details` is absent on most non-422 errors. */
export type ApiErrorBody = ErrorEnvelope['error']

export interface ApiErrorResponse {
  error?: ApiErrorBody
}

export interface ApiError {
  status: number
  data?: ApiErrorResponse
  message: string
}

type TransportErrorStatus = 'FETCH_ERROR' | 'PARSING_ERROR' | 'TIMEOUT_ERROR' | 'CUSTOM_ERROR'

function isTransportError(error: unknown): error is { status: TransportErrorStatus; error?: string } {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false
  const status = error.status
  return status === 'FETCH_ERROR' || status === 'PARSING_ERROR' || status === 'TIMEOUT_ERROR' || status === 'CUSTOM_ERROR'
}

/**
 * Type guard to check if an error is an RTK Query error
 */
export function isApiError(error: unknown): error is { status: number; data?: ApiErrorResponse } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error).status === 'number'
  )
}

function readErrorBody(data: unknown): ApiErrorBody | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) return null
  const body = (data as { error?: unknown }).error
  if (typeof body !== 'object' || body === null) return null
  return body as ApiErrorBody
}

/** The domain code of the envelope (for example `PAGE_EXISTS`, `ADMIN_REQUIRED`). Branch on this, not on the message. */
export function getErrorCode(error: unknown): string | null {
  if (!isApiError(error)) return null
  const code = readErrorBody(error.data)?.code
  return typeof code === 'string' && code.trim() ? code : null
}

/** Field errors from `details.fields`. Empty for any error that is not a 422. */
export function getFieldErrors(error: unknown): ValidationFieldError[] {
  if (!isApiError(error)) return []
  const fields = (readErrorBody(error.data)?.details as { fields?: unknown } | undefined)?.fields
  if (!Array.isArray(fields)) return []
  return fields.filter(
    (item): item is ValidationFieldError =>
      typeof item === 'object' && item !== null && typeof (item as { field?: unknown }).field === 'string' &&
      typeof (item as { msg?: unknown }).msg === 'string',
  )
}

/**
 * Extract a user-friendly error message from an API error.
 * Reads the envelope `{ error: { message, code } }`, then falls back to a
 * message for the HTTP status.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (isTransportError(error)) {
    if (/abort|cancel/i.test(error.error ?? '')) return 'The request was cancelled. Try again.'
    if (error.status === 'TIMEOUT_ERROR') return 'The request timed out. Check your connection and try again.'
    if (error.status === 'PARSING_ERROR') return 'The server returned an invalid response. Try again or contact support.'
    if (error.status === 'FETCH_ERROR') return 'Unable to connect to the server. Check your connection and try again.'
    return fallback
  }

  if (isApiError(error)) {
    const body = readErrorBody(error.data)
    if (body) {
      if (typeof body.message === 'string' && body.message.trim()) return body.message
      if (typeof body.code === 'string' && body.code.trim()) return body.code
    }

    if (error.status === 400) return 'Check the request details and try again.'
    if (error.status === 401) return 'Please log in to continue'
    if (error.status === 403) return 'You do not have permission to perform this action'
    if (error.status === 404) return 'This record no longer exists. Return to the list.'
    if (error.status === 408) return 'Request timed out. Please try again.'
    if (error.status === 409) return 'This action conflicts with the current state. Refresh and try again.'
    if (error.status === 422) return 'Validation error. Please check your inputs and try again.'
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.'
    if (error.status === 500) return 'Server error. Please try again later.'
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'Service temporarily unavailable. Please try again later.'
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'The request was cancelled. Try again.'
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}
