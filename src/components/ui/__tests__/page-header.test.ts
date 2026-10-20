import { inferPageBreadcrumbs } from '@/components/layout/pageBreadcrumbs'

it('links details back through the right property list', () => {
  expect(inferPageBreadcrumbs('/properties/123', 'Property details')).toEqual([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'All Properties', to: '/properties' },
    { label: 'Property details' },
  ])
  expect(inferPageBreadcrumbs('/pm/properties/123', 'Managed property details')).toEqual([
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Property Management', to: '/pm/dashboard' },
    { label: 'Managed Properties', to: '/pm/properties' },
    { label: 'Managed property details' },
  ])
})
