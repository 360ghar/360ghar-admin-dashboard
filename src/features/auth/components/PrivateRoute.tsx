import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/hooks/redux'
import { selectAuthInitialized, selectCurrentUser, selectIsAuthenticated } from '@/features/auth/slices/authSlice'
import { PageLoading } from '@/components/common/PageLoading'
import { ErrorState } from '@/components/ui/error-state'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/errors'

const PrivateRoute = () => {
  const location = useLocation()
  const from = `${location.pathname}${location.search}${location.hash}`
  const initialized = useAppSelector(selectAuthInitialized)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const currentUser = useAppSelector(selectCurrentUser)
  const profileStatus = useAppSelector((state) => state.auth.profileStatus)
  const verifying = useAppSelector((state) => state.auth.verifying)
  const cachedProfile = useAppSelector((state) => state.auth.cachedProfile)
  const [timedOut, setTimedOut] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(id)
  }, [])

  if (!initialized) {
    if (timedOut) return <Navigate to="/login?error=session-timeout" replace state={{ from }} />
    return <PageLoading />
  }

  if (profileStatus === 'pending') {
    if (verifying) return <PageLoading />
    const retry = async () => {
      if (!supabase || retrying) return
      setRetrying(true)
      setRetryError(null)
      try {
        const { error } = await supabase.auth.refreshSession()
        if (error) throw error
      } catch (error) {
        setRetryError(getErrorMessage(error, 'Could not retry account verification.'))
      } finally {
        setRetrying(false)
      }
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <ErrorState
          title="Account verification unavailable"
          description={retryError ?? `Your sign-in is saved${cachedProfile?.full_name ? ` for ${cachedProfile.full_name}` : ''}. Connect to the server to verify staff access.`}
          onRetry={() => void retry()}
          retryLabel={retrying ? 'Retrying…' : 'Retry verification'}
          className="w-full max-w-lg"
        />
      </main>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}

export default PrivateRoute
