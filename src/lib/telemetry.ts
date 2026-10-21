/** A local reporting adapter. Only allowlisted diagnostic context is emitted. */

export interface ReportedErrorContext {
  componentStack?: string
  operation?: string
  route?: string
  release?: string
  requestId?: string
}

const MAX_DIAGNOSTIC_LENGTH = 2000

function redact(value: string | undefined): string | undefined {
  if (!value) return value
  return value
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[token]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b\d{10,}\b/g, '[number]')
    .replace(/\b(access_token|refresh_token|api_key|password|token)=([^\s&]+)/gi, '$1=[redacted]')
    .slice(0, MAX_DIAGNOSTIC_LENGTH)
}

function safeRoute(pathname: string): string {
  return pathname
    .split('/')
    .map((part) => /^\d+$|^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part) ? ':id' : part)
    .join('/')
}

export function reportError(error: unknown, context: ReportedErrorContext = {}): void {
  try {
    const configuredRelease: unknown = import.meta.env.VITE_RELEASE
    const detail = {
      name: error instanceof Error ? error.name : typeof error,
      message: redact(error instanceof Error ? error.message : String(error)),
      stack: redact(error instanceof Error ? error.stack : undefined),
      componentStack: redact(context.componentStack),
      route: redact(safeRoute(context.route ?? (typeof window !== 'undefined' ? window.location.pathname : ''))),
      operation: redact(context.operation),
      release: redact(context.release ?? (typeof configuredRelease === 'string' ? configuredRelease : import.meta.env.MODE)),
      requestId: redact(context.requestId),
    }
    console.error('[360Ghar] Error', detail)
  } catch {
    // Reporting must never interrupt the user flow.
  }
}
