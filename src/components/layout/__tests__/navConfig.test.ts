import { filterByRole, flattenRoutes, NAV_ROUTES } from '../navConfig'

it('offers each destination once with distinct property list labels', () => {
  const routes = flattenRoutes(filterByRole(NAV_ROUTES, 'admin'))
  expect(new Set(routes.map((route) => route.href)).size).toBe(routes.length)
  expect(routes.find((route) => route.href === '/properties')?.name).toBe('All Properties')
  expect(routes.find((route) => route.href === '/pm/properties')?.name).toBe('Managed Properties')
  expect(routes.find((route) => route.href === '/pm/dashboard')?.name).toBe('Overview')
})

it('omits admin routes for agents', () => {
  const routes = flattenRoutes(filterByRole(NAV_ROUTES, 'agent'))
  expect(routes.some((route) => route.href === '/pm/audit')).toBe(false)
  expect(routes.some((route) => route.href === '/agents')).toBe(false)
})
