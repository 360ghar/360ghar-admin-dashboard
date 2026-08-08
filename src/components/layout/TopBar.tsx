import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { selectCurrentUser, clearCredentials } from '@/features/auth/slices/authSlice'
import { useUserRole } from '@/hooks/useUserRole'
import OwnerSelector from '@/features/pm/components/OwnerSelector'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User, Settings, LogOut, Search } from 'lucide-react'
import { ModeToggle } from '@/components/common/mode-toggle'
import { CommandPalette } from '@/components/common/CommandPalette'
import NotificationCenter from '@/features/core/components/notifications/NotificationCenter'
import { HealthIndicator } from '@/components/common/HealthIndicator'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import { useEffect, useState } from 'react'

const TopBar = () => {
  const user = useAppSelector(selectCurrentUser)
  const { role } = useUserRole()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const showOwnerSelector = location.pathname.startsWith('/pm') && (role === 'admin' || role === 'agent')

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    dispatch(clearCredentials())
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center justify-between border-b border-cohere-card-border bg-card/60 px-4 backdrop-blur-xl md:px-6 py-3 md:py-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Full nav on mobile is BottomNav "More" — avoid a second identical sheet here. */}
        {showOwnerSelector && <OwnerSelector />}
        <span className="hidden sm:block text-sm font-medium text-muted-foreground truncate">
          {user?.full_name ? user.full_name : '360 Ghar'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-2 rounded-cohere-pill text-muted-foreground sm:flex"
          aria-label="Search (Command-K)"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="touch-icon"
          onClick={() => setPaletteOpen(true)}
          className="sm:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <NotificationCenter />
        <HealthIndicator />
        <ModeToggle />
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 rounded-full px-3 py-2 h-auto hover:bg-accent">
              <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {getInitials(user?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{user?.full_name || 'User'}</div>
                <div className="text-xs text-muted-foreground">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : (user?.agent_id ? 'Agent' : 'Administrator')}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || user?.phone || 'No contact info'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={role === 'agent' ? '/agents/me' : '/profile'} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/users/preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()} className="flex items-center gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default TopBar
