import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportError } from '@/lib/telemetry'

interface Props {
  children: ReactNode
  /**
   * When any value in this array changes, a caught error is cleared so the
   * boundary re-renders its children. Lets a crashed page recover on
   * navigation WITHOUT remounting the subtree (which would wipe state and
   * re-trigger data fetches). Consumer should pass a primitive/array of
   * primitives (e.g. [location.pathname]).
   */
  resetKeys?: unknown[]
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, { componentStack: errorInfo.componentStack ?? undefined })
    this.setState({
      error,
      errorInfo
    })
  }

  public componentDidUpdate(prevProps: Props) {
    // Clear a caught error when resetKeys change (e.g. navigation) so the
    // boundary recovers without unmounting its children. We compare by
    // reference of each element; callers should pass stable primitives.
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      const prev = prevProps.resetKeys ?? []
      const next = this.props.resetKeys ?? []
      const changed =
        prev.length !== next.length ||
        prev.some((v, i) => !Object.is(v, next[i]))
      if (changed) {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined })
      }
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  public render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? ''
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(message)
      const isNetworkError = !isChunkError && /Failed to fetch$|NetworkError|Network Error|network request failed/i.test(message)

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>
                {isChunkError ? 'Page could not load' : isNetworkError ? 'Connection problem' : 'Something went wrong'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {isChunkError ? (
                  <p>A page file did not load. Reload the app to get the latest version.</p>
                ) : isNetworkError ? (
                  <div className="space-y-2">
                    <p>Unable to connect to the server. Please check your internet connection and try again.</p>
                    <p className="text-sm opacity-80">
                      Error: {this.state.error?.message}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>This page stopped working. Try opening it again.</p>
                    {import.meta.env.DEV && this.state.error && (
                      <details className="text-sm">
                        <summary className="cursor-pointer hover:underline">Error details</summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {this.state.error.toString()}
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={isChunkError ? this.handleReload : this.handleReset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isChunkError ? 'Reload App' : 'Try Again'}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Go Back
              </Button>
            </div>

            {isNetworkError && (
              <div className="text-center text-sm text-muted-foreground">
                <p>If the problem persists, please contact support.</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
