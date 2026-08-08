import { useCallback, useMemo } from 'react'
import { Shield, ArrowLeft, Home, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { useUserRole } from '@/hooks/useUserRole'
import { clearCredentials } from '@/features/auth/slices/authSlice'
import { supabase } from '@/lib/supabase'
import GlitchText from '@/components/reactbits/GlitchText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

type DeniedCondition =
  | 'unauthenticated' // no user, no token
  | 'expired' // user cached but no token
  | 'non_staff' // authenticated but role is 'user'
  | 'forbidden' // staff (admin/agent) hitting a route their role can't access

interface DeniedContent {
  title: string
  message: string
  primary: { label: string; icon: typeof LogIn; action: () => void }
  secondary?: { label: string; icon: typeof LogIn; action: () => void }
}

const useDeniedContent = (): DeniedContent => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const location = useLocation()
  const token = useAppSelector((s) => s.auth.token)
  const currentUser = useAppSelector((s) => s.auth.user)
  const { role } = useUserRole()
  const reason = (location.state as { reason?: string } | null)?.reason

  const signOutAndGoToLogin = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // best-effort: still clear local state below
      }
    }
    dispatch(clearCredentials())
    navigate('/login', { replace: true })
  }, [dispatch, navigate])

  return useMemo<DeniedContent>(() => {
    const condition: DeniedCondition = !currentUser
      ? 'unauthenticated'
      : !token
        ? 'expired'
        : role === 'user'
          ? 'non_staff'
          : reason === 'forbidden'
            ? 'forbidden'
            : 'unauthenticated'

    const onSignInAgain = () => void signOutAndGoToLogin()
    const onSignOut = () => void signOutAndGoToLogin()
    const onGoToLogin = () => navigate('/login', { replace: true })
    const onGoBack = () => navigate(-1)
    const onGoToDashboard = () => navigate('/dashboard', { replace: true })

    switch (condition) {
      case 'expired':
        return {
          title: 'Session Expired',
          message:
            'Your sign-in session has expired. Please sign in again to continue.',
          primary: { label: 'Sign in again', icon: LogIn, action: onSignInAgain },
          secondary: { label: 'Go Back', icon: ArrowLeft, action: onGoBack },
        }
      case 'non_staff':
        return {
          title: 'Staff Access Only',
          message:
            'This portal is restricted to admin and agent accounts. You are signed in as a regular user.',
          primary: { label: 'Sign out', icon: LogOut, action: onSignOut },
          secondary: { label: 'Go Back', icon: ArrowLeft, action: onGoBack },
        }
      case 'forbidden':
        return {
          title: 'Access Denied',
          message:
            "You don't have permission to view this page. If you believe this is an error, contact your administrator.",
          primary: { label: 'Go Back', icon: ArrowLeft, action: onGoBack },
          secondary: { label: 'Return to Dashboard', icon: Home, action: onGoToDashboard },
        }
      case 'unauthenticated':
      default:
        return {
          title: 'Sign In Required',
          message: 'Please sign in to access the portal.',
          primary: { label: 'Go to Login', icon: LogIn, action: onGoToLogin },
        }
    }
  }, [currentUser, token, role, reason, navigate, signOutAndGoToLogin])
}

const AccessDeniedPage = () => {
  const content = useDeniedContent()
  const prefersReducedMotion = usePrefersReducedMotion()
  const PrimaryIcon = content.primary.icon
  const SecondaryIcon = content.secondary?.icon

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-cohere-md border border-cohere-card-border bg-card/60 backdrop-blur-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            {prefersReducedMotion ? (
              <h1 className="text-2xl font-bold text-foreground mb-2">{content.title}</h1>
            ) : (
              <GlitchText className="!text-3xl mb-2">{content.title}</GlitchText>
            )}
            <p className="text-muted-foreground mb-6">{content.message}</p>
          </div>

          <div className="space-y-3">
            <Button onClick={content.primary.action} className="w-full gap-2">
              <PrimaryIcon className="w-4 h-4" />
              {content.primary.label}
            </Button>

            {content.secondary && SecondaryIcon && (
              <Button
                onClick={content.secondary.action}
                variant="outline"
                className="w-full gap-2"
              >
                <SecondaryIcon className="w-4 h-4" />
                {content.secondary.label}
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              If you continue experiencing issues, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AccessDeniedPage
