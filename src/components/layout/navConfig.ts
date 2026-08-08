import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileSearch,
  FileText,
  Folder,
  HardHat,
  Heart,
  HelpCircle,
  Home,
  Receipt,
  Settings,
  Smartphone,
  Tag,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * Single source of truth for dashboard navigation.
 *
 * Consumed by `SidebarContent`, `BottomNav` and `CommandPalette` so a new
 * route is added in exactly one place. `roles` restricts visibility
 * (undefined = visible to admin + agent).
 */
export interface NavRoute {
  name: string
  href: string
  icon: LucideIcon
  roles?: ReadonlyArray<'admin' | 'agent'>
  children?: NavRoute[]
}

export const NAV_ROUTES: NavRoute[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'All Properties', href: '/properties', icon: Building },
  { name: 'Visits', href: '/visits', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: BookOpen },
  { name: 'Discover', href: '/swipes', icon: Heart },
  {
    name: 'Property Management',
    href: '/pm/dashboard',
    icon: ClipboardList,
    children: [
      { name: 'Overview', href: '/pm/dashboard', icon: Home },
      { name: 'Owners', href: '/pm/owners', icon: Users },
      { name: 'Managed Properties', href: '/pm/properties', icon: Building },
      {
        name: 'Leases & Tenants',
        href: '/pm/leases',
        icon: Briefcase,
        children: [
          { name: 'Applications', href: '/pm/applications', icon: FileSearch },
          { name: 'Leases', href: '/pm/leases', icon: FileText },
          { name: 'Rent Ledger', href: '/pm/rent-ledger', icon: Receipt },
        ],
      },
      {
        name: 'Operations',
        href: '/pm/maintenance',
        icon: HardHat,
        children: [
          { name: 'Maintenance', href: '/pm/maintenance', icon: Wrench },
          { name: 'Inspections', href: '/pm/inspections', icon: ClipboardCheck },
          { name: 'Expenses', href: '/pm/expenses', icon: Receipt },
        ],
      },
      { name: 'Documents', href: '/pm/documents', icon: Folder },
      { name: 'Reports', href: '/pm/reports', icon: FileBarChart },
      { name: 'Audit Log', href: '/pm/audit', icon: FileText, roles: ['admin'] },
    ],
  },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Agents', href: '/agents', icon: User, roles: ['admin'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
  {
    name: 'Admin Tools',
    href: '/bug-reports',
    icon: Settings,
    roles: ['admin'],
    children: [
      { name: 'Bug Reports', href: '/bug-reports', icon: AlertCircle },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      {
        name: 'Blogs',
        href: '/blogs',
        icon: FileText,
        children: [
          { name: 'All Posts', href: '/blogs', icon: FileText },
          { name: 'Categories', href: '/blogs/categories', icon: Folder },
          { name: 'Tags', href: '/blogs/tags', icon: Tag },
        ],
      },
      { name: 'Pages', href: '/pages', icon: FileText },
      { name: 'FAQs', href: '/faqs', icon: HelpCircle },
      { name: 'App Updates', href: '/app-updates', icon: Smartphone },
    ],
  },
  {
    name: 'Flatmates Moderation',
    href: '/flatmates/moderation',
    icon: ClipboardCheck,
    roles: ['admin'],
  },
  {
    name: 'Flatmates Reports',
    href: '/flatmates/reports',
    icon: AlertCircle,
    roles: ['admin'],
  },
]

export type StaffRole = 'admin' | 'agent'

/** Prune routes whose `roles` restriction excludes `role`. */
export function filterByRole(routes: readonly NavRoute[], role: string): NavRoute[] {
  return routes
    .filter((r) => !r.roles || r.roles.includes(role as StaffRole))
    .map((r) => (r.children ? { ...r, children: filterByRole(r.children, role) } : r))
}

/** Depth-first flatten of a route tree (for search palettes / mobile nav). */
export function flattenRoutes(routes: readonly NavRoute[]): NavRoute[] {
  const out: NavRoute[] = []
  const walk = (list: readonly NavRoute[]) => {
    for (const route of list) {
      out.push(route)
      if (route.children) walk(route.children)
    }
  }
  walk(routes)
  return out
}
