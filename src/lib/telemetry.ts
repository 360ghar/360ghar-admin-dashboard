/**
 * Minimal error-reporting sink.
 *
 * Every render error in the app funnels through `reportError` (see
 * `components/common/ErrorBoundary.tsx`). Until a crash service (Sentry or
 * equivalent) is provisioned, this emits a structured console report that
 * captures the error name/message/stack plus the component stack — the only
 * diagnostic signal available in production today.
 *
 * To enable real telemetry: replace the body with your SDK's capture call and
 * keep the try/catch guard so the reporter itself can never throw.
 */

export interface ReportedErrorContext {
  componentStack?: string
  extra?: Record<string, unknown>
}

export function reportError(error: unknown, context: ReportedErrorContext = {}): void {
  try {
    const detail: Record<string, unknown> = {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      componentStack: context.componentStack,
      ...(context.extra ?? {}),
      href: typeof window !== 'undefined' ? window.location.href : undefined,
    }
    console.error('[360Ghar] Uncaught error', detail)
  } catch {
    // Never let the reporter itself throw.
  }
}
