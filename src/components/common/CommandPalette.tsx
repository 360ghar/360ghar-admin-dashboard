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
import {
  BarChart3,
  Bell,
  BookOpen,
  Building,
  Calendar,
  CalendarPlus,
  ClipboardList,
  FileBarChart,
  FileSearch,
  FileText,
  Folder,
  HelpCircle,
  Home,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Wrench,
  ClipboardCheck,
  HardHat,
  Settings,
  Bug,
  User,
  Sliders,
  Heart,
  AlertCircle,
} from 'lucide-react'

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
            <CommandItem onSelect={() => go('/dashboard')}>
              <Home className="h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go('/properties')}>
              <Building className="h-4 w-4" />
              Properties
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/dashboard')}>
              <ClipboardList className="h-4 w-4" />
              Property Management
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/properties')}>
              <Building className="h-4 w-4" />
              PM Properties
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/leases')}>
              <FileText className="h-4 w-4" />
              Leases & Tenants
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/applications')}>
              <FileSearch className="h-4 w-4" />
              Applications
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/rent-ledger')}>
              <Receipt className="h-4 w-4" />
              Rent Ledger
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/maintenance')}>
              <Wrench className="h-4 w-4" />
              Maintenance
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/inspections')}>
              <ClipboardCheck className="h-4 w-4" />
              Inspections
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/expenses')}>
              <HardHat className="h-4 w-4" />
              Expenses
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/documents')}>
              <Folder className="h-4 w-4" />
              PM Documents
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/owners')}>
              <Users className="h-4 w-4" />
              PM Owners
            </CommandItem>
            <CommandItem onSelect={() => go('/pm/reports')}>
              <FileBarChart className="h-4 w-4" />
              PM Reports
            </CommandItem>
            {isAdmin && (
              <>
                <CommandItem onSelect={() => go('/pm/audit')}>
                  <ShieldCheck className="h-4 w-4" />
                  Audit Log
                </CommandItem>
                <CommandItem onSelect={() => go('/pm/settings')}>
                  <Settings className="h-4 w-4" />
                  PM Settings
                </CommandItem>
              </>
            )}
            <CommandItem onSelect={() => go('/visits')}>
              <Calendar className="h-4 w-4" />
              Visits
            </CommandItem>
            <CommandItem onSelect={() => go('/visits?view=manage')}>
              <ClipboardList className="h-4 w-4" />
              Manage Visits
            </CommandItem>
            <CommandItem onSelect={() => go('/bookings')}>
              <BookOpen className="h-4 w-4" />
              Bookings
            </CommandItem>
            <CommandItem onSelect={() => go('/bookings?view=manage')}>
              <ClipboardList className="h-4 w-4" />
              Manage Bookings
            </CommandItem>
            <CommandItem onSelect={() => go('/users')}>
              <Users className="h-4 w-4" />
              Users
            </CommandItem>
            {isAdmin && (
              <>
                <CommandItem onSelect={() => go('/agents')}>
                  <UserCog className="h-4 w-4" />
                  Agents
                </CommandItem>
                <CommandItem onSelect={() => go('/analytics')}>
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </CommandItem>
                <CommandItem onSelect={() => go('/notifications')}>
                  <Bell className="h-4 w-4" />
                  Notifications
                </CommandItem>
                <CommandItem onSelect={() => go('/blogs')}>
                  <FileText className="h-4 w-4" />
                  Blog
                </CommandItem>
                <CommandItem onSelect={() => go('/faqs')}>
                  <HelpCircle className="h-4 w-4" />
                  FAQs
                </CommandItem>
                <CommandItem onSelect={() => go('/pages')}>
                  <FileText className="h-4 w-4" />
                  CMS Pages
                </CommandItem>
                <CommandItem onSelect={() => go('/app-updates')}>
                  <Smartphone className="h-4 w-4" />
                  App Updates
                </CommandItem>
                <CommandItem onSelect={() => go('/flatmates/moderation')}>
                  <ClipboardCheck className="h-4 w-4" />
                  Flatmates Moderation
                </CommandItem>
                <CommandItem onSelect={() => go('/flatmates/reports')}>
                  <AlertCircle className="h-4 w-4" />
                  Flatmates Reports
                </CommandItem>
                <CommandItem onSelect={() => go('/bug-reports')}>
                  <Bug className="h-4 w-4" />
                  Bug Reports
                </CommandItem>
              </>
            )}
          </CommandGroup>
        )}
        {isStaff && <CommandSeparator />}
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go(isAgent ? '/agents/me' : '/profile')}>
            <User className="h-4 w-4" />
            Profile
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
