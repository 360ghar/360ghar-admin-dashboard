import { filterByRole, flattenRoutes, NAV_ROUTES } from './navConfig'

export interface PageBreadcrumb {
  label: string
  to?: string
}

/** `role` hides crumbs that link to pages the role cannot open. */
export function inferPageBreadcrumbs(pathname: string, title: string, role?: string): PageBreadcrumb[] {
  if (pathname === '/' || pathname === '/dashboard') return []
  if (pathname === '/pm/dashboard') return [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Property Management' }]

  // Users cannot open the staff dashboard, so they get no Dashboard crumb.
  const result: PageBreadcrumb[] = role === 'user' ? [] : [{ label: 'Dashboard', to: '/dashboard' }]
  if (pathname.startsWith('/pm/')) result.push({ label: 'Property Management', to: '/pm/dashboard' })

  const match = flattenRoutes(role ? filterByRole(NAV_ROUTES, role) : NAV_ROUTES)
    .filter((route) => pathname === route.href || pathname.startsWith(`${route.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]

  if (match && pathname !== match.href && match.href !== '/pm/dashboard' && !pathname.startsWith('/users/preferences') && !pathname.startsWith('/users/profile')) {
    result.push({ label: match.name, to: match.href })
  }

  result.push({ label: pathname === match?.href ? match.name : title })
  return result
}
