/**
 * API Error types and utilities for consistent error handling
 */

export interface ApiErrorEnvelope {
  code?: string
  message?: string
  details?: unknown
}

export interface ApiErrorResponse {
  /** Nested backend envelope: `{ error: { code, message, details? } }` */
  error?: ApiErrorEnvelope | string
  detail?: string | Array<{ msg?: string; message?: string }> | { msg?: string; message?: string }
  message?: string
  errors?: Record<string, string[]>
  status?: number
}

export interface ApiError {
  status: number
  data?: ApiErrorResponse
  message: string
}

/**
 * Type guard to check if an error is an RTK Query error
 */
export function isApiError(error: unknown): error is { status: number; data?: ApiErrorResponse } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  )
}

function messageFromDetail(detail: ApiErrorResponse['detail']): string | null {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (typeof d === 'string' ? d : d?.msg || d?.message || ''))
      .filter(Boolean)
    return msgs.length ? msgs.join(', ') : null
  }
  if (detail && typeof detail === 'object') {
    const msg = detail.msg || detail.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return null
}

/**
 * Extract a user-friendly error message from an API error.
 * Prefers backend envelope `{ error: { message, code } }`, then FastAPI `detail`.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (isApiError(error)) {
    const data = error.data
    const nested = data?.error
    if (nested && typeof nested === 'object') {
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message
      if (typeof nested.code === 'string' && nested.code.trim()) return nested.code
    }
    if (typeof nested === 'string' && nested.trim()) return nested

    const fromDetail = messageFromDetail(data?.detail)
    if (fromDetail) return fromDetail

    if (typeof data?.message === 'string' && data.message.trim()) return data.message

    if (error.status === 400) return 'Bad request. Please check your input.'
    if (error.status === 401) return 'Please log in to continue'
    if (error.status === 403) return 'You do not have permission to perform this action'
    if (error.status === 404) return 'The requested resource was not found'
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
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}

/**
 * Parse validation errors from API response
 */
export function getValidationErrors(error: unknown): Record<string, string> | null {
  if (isApiError(error) && error.data?.errors) {
    const result: Record<string, string> = {}
    for (const [field, messages] of Object.entries(error.data.errors)) {
      result[field] = Array.isArray(messages) ? messages[0] : String(messages)
    }
    return result
  }
  return null
}
