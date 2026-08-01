import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PrivateRoute from '@/features/auth/components/PrivateRoute'
import RoleBasedRoute from '@/features/auth/components/RoleBasedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { PageLoading } from '@/components/common/PageLoading'
import { useAppDispatch } from '@/hooks/redux'
import { clearCredentials, loadUserFromStorage, setCredentials, setInitialized } from '@/features/auth/slices/authSlice'
import { supabase } from '@/lib/supabase'
import { store } from '@/store'
import { fetchUserProfileWithStatus } from '@/lib/auth'
import { isLoginInProgress } from '@/lib/loginState'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage'))
const AuthCallbackPage = lazy(() => import('@/features/auth/pages/AuthCallbackPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('@/features/core/pages/DashboardPage'))
const PropertiesPage = lazy(() => import('@/features/properties/pages/PropertiesPage'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const AgentsPage = lazy(() => import('@/features/agents/pages/AgentsPage'))
const VisitsPage = lazy(() => import('@/features/visits/pages/VisitsPage'))
const BookingsPage = lazy(() => import('@/features/bookings/pages/BookingsPage'))
const AnalyticsPage = lazy(() => import('@/features/core/pages/AnalyticsPage'))
const AccessDeniedPage = lazy(() => import('@/features/core/pages/AccessDeniedPage'))
const ProfilePage = lazy(() => import('@/features/core/pages/ProfilePage'))
const AgentProfilePage = lazy(() => import('@/features/agents/pages/AgentProfilePage'))
const UserPreferencesPage = lazy(() => import('@/features/core/pages/UserPreferencesPage'))
const UserProfilePage = lazy(() => import('@/features/users/pages/UserProfilePage'))
const ModerationQueuePage = lazy(() => import('@/features/flatmates/pages/ModerationQueuePage'))
const ReportsReviewPage = lazy(() => import('@/features/flatmates/pages/ReportsReviewPage'))
const BugReportsPage = lazy(() => import('@/features/core/pages/BugReportsPage'))
const PagesManagementPage = lazy(() => import('@/features/core/pages/PagesManagementPage'))
const FaqsManagementPage = lazy(() => import('@/features/core/pages/FaqsManagementPage'))
const AppUpdatesPage = lazy(() => import('@/features/core/pages/AppUpdatesPage'))
const BlogsPage = lazy(() => import('@/features/blog/pages/BlogsPage'))
const CategoriesPage = lazy(() => import('@/features/blog/pages/categories/CategoriesPage'))
const TagsPage = lazy(() => import('@/features/blog/pages/tags/TagsPage'))
const NotificationsPage = lazy(() => import('@/features/core/pages/NotificationsPage'))
const SwipePage = lazy(() => import('@/features/swipes/pages/SwipePage'))
const NotFoundPage = lazy(() => import('@/features/core/pages/NotFoundPage'))

// Property Management (PM)
const PmDashboardPage = lazy(() => import('@/features/pm/pages/PmDashboardPage'))
const PmOwnersPage = lazy(() => import('@/features/pm/pages/PmOwnersPage'))
const PmOwnerDetailPage = lazy(() => import('@/features/pm/pages/PmOwnerDetailPage'))
const PmPropertiesPage = lazy(() => import('@/features/pm/pages/PmPropertiesPage'))
const PmPropertyDetailPage = lazy(() => import('@/features/pm/pages/PmPropertyDetailPage'))
const PmApplicationsPage = lazy(() => import('@/features/pm/pages/PmApplicationsPage'))
const PmApplicationDetailPage = lazy(() => import('@/features/pm/pages/PmApplicationDetailPage'))
const PmLeasesPage = lazy(() => import('@/features/pm/pages/PmLeasesPage'))
const PmLeaseDetailPage = lazy(() => import('@/features/pm/pages/PmLeaseDetailPage'))
const PmRentLedgerPage = lazy(() => import('@/features/pm/pages/PmRentLedgerPage'))
const PmExpensesPage = lazy(() => import('@/features/pm/pages/PmExpensesPage'))
const PmMaintenancePage = lazy(() => import('@/features/pm/pages/PmMaintenancePage'))
const PmDocumentsPage = lazy(() => import('@/features/pm/pages/PmDocumentsPage'))
const PmInspectionsPage = lazy(() => import('@/features/pm/pages/PmInspectionsPage'))
const PmInspectionDetailPage = lazy(() => import('@/features/pm/pages/PmInspectionDetailPage'))
const PmReportsPage = lazy(() => import('@/features/pm/pages/PmReportsPage'))
const PmAuditLogPage = lazy(() => import('@/features/pm/pages/PmAuditLogPage'))
const PmSettingsPage = lazy(() => import('@/features/pm/pages/PmSettingsPage'))

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!supabase) {
      dispatch(clearCredentials())
      dispatch(setInitialized(true))
      return
    }

    let isMounted = true
    const client = supabase

    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // TOKEN_REFRESHED: keep the Redux token fresh so prepareHeaders can
        // serve it without a per-request Supabase getSession() round-trip.
        if (event === 'TOKEN_REFRESHED') {
          const { auth } = store.getState()
          if (auth.user && session?.access_token) {
            dispatch(setCredentials({ token: session.access_token, user: auth.user }))
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          dispatch(clearCredentials())
          return
        }

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (!session?.access_token) {
            dispatch(clearCredentials())
            if (event === 'INITIAL_SESSION') {
              dispatch(setInitialized(true))
            }
            return
          }

          // SIGNED_IN fires after LoginPage already set credentials in Redux.
          // Skip the redundant profile fetch — either credentials are already
          // set, or the login flow is mid-flight and will set them shortly.
          if (event === 'SIGNED_IN') {
            if (isLoginInProgress.current) return
            const { auth } = store.getState()
            if (auth.token && auth.user) return
          }

          const { user, status } = await fetchUserProfileWithStatus(session.access_token)
          if (!isMounted) return

          if (user) {
            dispatch(setCredentials({ token: session.access_token, user }))
          } else if (status === 404) {
            // The backend explicitly has no profile for this session — the
            // account is not a provisioned staff member. Do NOT fall back to
            // the cached user (that would keep a revoked account logged in).
            dispatch(clearCredentials())
          } else {
            // Transient failure (backend down / network) — do NOT sign out of
            // Supabase. The session is still valid; fall back to the cached
            // user so the session survives a refresh.
            const cachedUser = loadUserFromStorage()
            if (cachedUser) {
              dispatch(setCredentials({ token: session.access_token, user: cachedUser }))
            } else {
              dispatch(clearCredentials())
            }
          }

          if (event === 'INITIAL_SESSION') {
            dispatch(setInitialized(true))
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [dispatch])

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* All users */}
              <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
              <Route path="/users/preferences" element={<ErrorBoundary><UserPreferencesPage /></ErrorBoundary>} />
              <Route path="/users/profile" element={<ErrorBoundary><UserProfilePage /></ErrorBoundary>} />

              {/* Staff-only (admin + agent) */}
              <Route element={<RoleBasedRoute allowedRoles={["admin", "agent"]} />}>
                <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />

                {/* PM Portal */}
                <Route path="/pm" element={<Navigate to="/pm/dashboard" replace />} />
                <Route path="/pm/dashboard" element={<ErrorBoundary><PmDashboardPage /></ErrorBoundary>} />
                <Route path="/pm/owners" element={<ErrorBoundary><PmOwnersPage /></ErrorBoundary>} />
                <Route path="/pm/owners/:ownerId" element={<ErrorBoundary><PmOwnerDetailPage /></ErrorBoundary>} />
                <Route path="/pm/properties" element={<ErrorBoundary><PmPropertiesPage /></ErrorBoundary>} />
                <Route path="/pm/properties/:propertyId" element={<ErrorBoundary><PmPropertyDetailPage /></ErrorBoundary>} />
                <Route path="/pm/applications" element={<ErrorBoundary><PmApplicationsPage /></ErrorBoundary>} />
                <Route path="/pm/applications/:applicationId" element={<ErrorBoundary><PmApplicationDetailPage /></ErrorBoundary>} />
                <Route path="/pm/leases" element={<ErrorBoundary><PmLeasesPage /></ErrorBoundary>} />
                <Route path="/pm/leases/:leaseId" element={<ErrorBoundary><PmLeaseDetailPage /></ErrorBoundary>} />
                <Route path="/pm/rent-ledger" element={<ErrorBoundary><PmRentLedgerPage /></ErrorBoundary>} />
                <Route path="/pm/expenses" element={<ErrorBoundary><PmExpensesPage /></ErrorBoundary>} />
                <Route path="/pm/maintenance" element={<ErrorBoundary><PmMaintenancePage /></ErrorBoundary>} />
                <Route path="/pm/documents" element={<ErrorBoundary><PmDocumentsPage /></ErrorBoundary>} />
                <Route path="/pm/inspections" element={<ErrorBoundary><PmInspectionsPage /></ErrorBoundary>} />
                <Route path="/pm/inspections/:inspectionId" element={<ErrorBoundary><PmInspectionDetailPage /></ErrorBoundary>} />
                <Route path="/pm/reports" element={<ErrorBoundary><PmReportsPage /></ErrorBoundary>} />

                <Route path="/properties" element={<ErrorBoundary><PropertiesPage /></ErrorBoundary>} />
                <Route path="/properties/new" element={<ErrorBoundary><PropertiesPage mode="create" /></ErrorBoundary>} />
                <Route path="/properties/:id" element={<ErrorBoundary><PropertiesPage mode="edit" /></ErrorBoundary>} />
                <Route path="/properties/:id/view" element={<ErrorBoundary><PropertiesPage mode="view" /></ErrorBoundary>} />
                <Route path="/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
                <Route path="/users/:id" element={<ErrorBoundary><UsersPage mode="detail" /></ErrorBoundary>} />
                <Route path="/agents/me" element={<ErrorBoundary><AgentProfilePage /></ErrorBoundary>} />
                <Route path="/agents/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/visits" element={<ErrorBoundary><VisitsPage /></ErrorBoundary>} />
                <Route path="/visits/new" element={<ErrorBoundary><VisitsPage mode="create" /></ErrorBoundary>} />
                <Route path="/visits/manage" element={<Navigate to="/visits?view=manage" replace />} />
                <Route path="/visits/:id" element={<ErrorBoundary><VisitsPage mode="detail" /></ErrorBoundary>} />
                <Route path="/bookings" element={<ErrorBoundary><BookingsPage /></ErrorBoundary>} />
                <Route path="/bookings/manage" element={<Navigate to="/bookings?view=manage" replace />} />
                <Route path="/bookings/:id" element={<ErrorBoundary><BookingsPage mode="detail" /></ErrorBoundary>} />
                <Route path="/swipes" element={<ErrorBoundary><SwipePage /></ErrorBoundary>} />

                {/* Admin-only nested */}
                <Route element={<RoleBasedRoute allowedRoles={["admin"]} />}>
                  <Route path="/agents" element={<ErrorBoundary><AgentsPage /></ErrorBoundary>} />
                  <Route path="/agents/new" element={<ErrorBoundary><AgentsPage mode="create" /></ErrorBoundary>} />
                  <Route path="/agents/:id" element={<ErrorBoundary><AgentsPage mode="edit" /></ErrorBoundary>} />
                  <Route path="/agents/:id/stats" element={<ErrorBoundary><AgentsPage mode="stats" /></ErrorBoundary>} />
                  <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                  <Route path="/flatmates/moderation" element={<ErrorBoundary><ModerationQueuePage /></ErrorBoundary>} />
                  <Route path="/flatmates/reports" element={<ErrorBoundary><ReportsReviewPage /></ErrorBoundary>} />
                  <Route path="/bug-reports" element={<ErrorBoundary><BugReportsPage /></ErrorBoundary>} />
                  <Route path="/blogs" element={<ErrorBoundary><BlogsPage /></ErrorBoundary>} />
                  <Route path="/blogs/new" element={<ErrorBoundary><BlogsPage mode="create" /></ErrorBoundary>} />
                  <Route path="/blogs/:identifier" element={<ErrorBoundary><BlogsPage mode="detail" /></ErrorBoundary>} />
                  <Route path="/blogs/:identifier/edit" element={<ErrorBoundary><BlogsPage mode="edit" /></ErrorBoundary>} />
                  <Route path="/blogs/categories" element={<ErrorBoundary><CategoriesPage /></ErrorBoundary>} />
                  <Route path="/blogs/tags" element={<ErrorBoundary><TagsPage /></ErrorBoundary>} />
                  <Route path="/pages" element={<ErrorBoundary><PagesManagementPage /></ErrorBoundary>} />
                  <Route path="/faqs" element={<ErrorBoundary><FaqsManagementPage /></ErrorBoundary>} />
                  <Route path="/app-updates" element={<ErrorBoundary><AppUpdatesPage /></ErrorBoundary>} />
                  <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
                  {/* Reviews module removed */}

                  {/* PM admin-only */}
                  <Route path="/pm/audit" element={<ErrorBoundary><PmAuditLogPage /></ErrorBoundary>} />
                  <Route path="/pm/settings" element={<ErrorBoundary><PmSettingsPage /></ErrorBoundary>} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
