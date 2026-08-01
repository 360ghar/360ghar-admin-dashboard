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

  public render() {
    if (this.state.hasError) {
      // Fetch failures surface as TypeError ("Failed to fetch") or network
      // message strings; anything else is an app bug.
      const message = this.state.error?.message ?? ''
      const isNetworkError =
        this.state.error?.name === 'TypeError' ||
        message.includes('Network Error') ||
        message.includes('fetch')

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>
                {isNetworkError ? 'Network Error' : 'Something went wrong'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {isNetworkError ? (
                  <div className="space-y-2">
                    <p>Unable to connect to the server. Please check your internet connection and try again.</p>
                    <p className="text-sm opacity-80">
                      Error: {this.state.error?.message}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>We encountered an unexpected error. Please reload the page and try again.</p>
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
              <Button onClick={this.handleReload} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
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