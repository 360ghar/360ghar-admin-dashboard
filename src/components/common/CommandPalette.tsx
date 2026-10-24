import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useUserRole } from '@/hooks/useUserRole'
import { User, Sliders, Plus, CalendarPlus } from 'lucide-react'
import { filterByRole, flattenRoutes, NAV_ROUTES } from '@/components/layout/navConfig'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { role } = useUserRole()
  const isAdmin = role === 'admin'
  const isAgent = role === 'agent'
  const isStaff = isAdmin || isAgent
  const routes = filterByRole(NAV_ROUTES, role)
  const workspace = routes.filter((route) => ['Dashboard', 'All Properties', 'Users', 'Agents', 'Analytics'].includes(route.name))
  const engagement = routes.filter((route) => ['Visits', 'Bookings', 'Discover', 'Flatmates Moderation', 'Flatmates Reports'].includes(route.name))
  const propertyManagement = flattenRoutes(routes.find((route) => route.name === 'Property Management')?.children ?? [])
  const adminTools = flattenRoutes(routes.find((route) => route.name === 'Admin Tools')?.children ?? [])

  const go = (path: string) => {
    onOpenChange(false)
    void navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" autoFocus />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {isStaff && (
          <CommandGroup heading="Workspace">
            {workspace.map((route) => (
              <CommandItem key={route.href} value={`Workspace ${route.name} ${route.href}`} onSelect={() => go(route.href)}>
                <route.icon className="h-4 w-4" />
                {route.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {isStaff && (
          <CommandGroup heading="Engagement">
            {engagement.map((route) => (
              <CommandItem key={route.href} value={`Engagement ${route.name} ${route.href}`} onSelect={() => go(route.href)}>
                <route.icon className="h-4 w-4" />
                {route.name}
              </CommandItem>
            ))}
            <CommandItem onSelect={() => go('/visits?view=manage')}>
              <CalendarPlus className="h-4 w-4" />
              Manage Visits
            </CommandItem>
            <CommandItem onSelect={() => go('/bookings?view=manage')}>
              <CalendarPlus className="h-4 w-4" />
              Manage Bookings
            </CommandItem>
          </CommandGroup>
        )}
        {isStaff && propertyManagement.length > 0 && (
          <CommandGroup heading="Property Management">
            {propertyManagement.map((route) => (
              <CommandItem key={route.href} value={`Property Management ${route.name} ${route.href}`} onSelect={() => go(route.href)}>
                <route.icon className="h-4 w-4" />
                {route.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {isStaff && adminTools.length > 0 && (
          <CommandGroup heading="Admin Tools">
            {adminTools.map((route) => (
              <CommandItem key={route.href} value={`Admin Tools ${route.name} ${route.href}`} onSelect={() => go(route.href)}>
                <route.icon className="h-4 w-4" />
                {route.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {isStaff && <CommandSeparator />}
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go(isAgent ? '/agents/me' : '/profile')}>
            <User className="h-4 w-4" />
            My Account
          </CommandItem>
          <CommandItem onSelect={() => go('/users/profile')}>
            <User className="h-4 w-4" />
            User Profile
          </CommandItem>
          <CommandItem onSelect={() => go('/users/preferences')}>
            <Sliders className="h-4 w-4" />
            Preferences
          </CommandItem>

        </CommandGroup>
        {isStaff && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go('/properties/new')}>
                <Plus className="h-4 w-4" />
                New property
              </CommandItem>
              <CommandItem onSelect={() => go('/visits/new')}>
                <CalendarPlus className="h-4 w-4" />
                Schedule visit
              </CommandItem>
              {isAdmin && (
                <CommandItem onSelect={() => go('/agents/new')}>
                  <Plus className="h-4 w-4" />
                  New agent
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
