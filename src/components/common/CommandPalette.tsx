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
import { User, Sliders, Plus, CalendarPlus, Heart } from 'lucide-react'
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

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" autoFocus />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {isStaff && (
          <CommandGroup heading="Navigate">
            {flattenRoutes(filterByRole(NAV_ROUTES, role)).map((route) => (
              <CommandItem key={route.href} onSelect={() => go(route.href)}>
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
        {isStaff && <CommandSeparator />}
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go(isAgent ? '/agents/me' : '/profile')}>
            <User className="h-4 w-4" />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => go('/users/profile')}>
            <User className="h-4 w-4" />
            My Profile
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
              <CommandItem onSelect={() => go('/swipes')}>
                <Heart className="h-4 w-4" />
                Discover properties
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
