import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'

type Role = 'admin' | 'agent' | 'user'

interface RoleBasedRouteProps {
  allowedRoles: Role[]
}

const RoleBasedRoute = ({ allowedRoles }: RoleBasedRouteProps) => {
  const location = useLocation()
  const { user: currentUser, role } = useUserRole()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }

  // Prefer explicit role from API; fall back for older payloads
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace state={{ reason: 'forbidden' }} />
  }

  return <Outlet />
}

export default RoleBasedRoute
