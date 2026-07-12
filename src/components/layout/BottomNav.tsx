import { Link, useLocation } from 'react-router-dom'
import { Home, Building, Calendar, ClipboardList, MoreHorizontal, User } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SidebarContent } from './SidebarContent'
import { cn } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'

interface NavItem {
  name: string
  href: string
  icon: typeof Home
}

const staffNavItems: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Properties', href: '/properties', icon: Building },
  { name: 'Visits', href: '/visits', icon: Calendar },
  { name: 'PM', href: '/pm/dashboard', icon: ClipboardList },
]

const BottomNav = () => {
  const location = useLocation()
  const { role } = useUserRole()
  const isStaff = role === 'admin' || role === 'agent'
  const profileHref = role === 'agent' ? '/agents/me' : '/profile'
  const navItems = isStaff
    ? staffNavItems
    : [{ name: 'Profile', href: profileHref, icon: User }]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    if (href === '/profile' || href === '/agents/me') {
      return location.pathname === href
    }
    if (href === '/pm/dashboard') {
      return location.pathname.startsWith('/pm')
    }
    if (location.pathname === href) return true
    if (!location.pathname.startsWith(href + '/')) return false
    // Keep list tabs inactive on dedicated /manage siblings (legacy redirects)
    const first = location.pathname.slice(href.length + 1).split('/')[0]
    if ((href === '/visits' || href === '/bookings') && first === 'manage') return false
    return true
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe-bottom">
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', active && 'text-primary')}>
                {item.name}
              </span>
            </Link>
          )
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="pt-2 overflow-y-auto h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}

export default BottomNav
