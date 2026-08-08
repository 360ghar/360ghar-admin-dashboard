import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation'

const DashboardLayout = () => {
  const location = useLocation()
  useRealtimeInvalidation()
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-cohere-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-y-auto bg-background bg-[radial-gradient(1200px_420px_at_50%_-8%,hsl(var(--cohere-action-blue)/0.08),transparent_65%)] p-4 pb-20 md:pb-4 lg:p-6 lg:pb-6"
        >
          {/* resetKeys clears the boundary's error state when the user
              navigates away from a crashed page, without remounting the
              whole subtree on every route change (which caused full-page
              state loss and data refetches on every navigation). */}
          <ErrorBoundary resetKeys={[location.pathname]}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  )
}

export default DashboardLayout
