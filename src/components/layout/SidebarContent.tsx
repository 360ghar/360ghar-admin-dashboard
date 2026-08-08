import { useUserRole } from '@/hooks/useUserRole'
import { NavItem } from './NavItem'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { filterByRole, NAV_ROUTES, type NavRoute } from './navConfig'
import { PanelLeftClose, PanelLeftOpen, User } from 'lucide-react'
import GradientText from '@/components/reactbits/GradientText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

interface NavSection {
    label?: string
    items: NavRoute[]
}

interface SidebarContentProps {
    /** Icon-rail mode: labels/section headers hidden, NavItem shows tooltips + flyouts. */
    collapsed?: boolean
    /** When provided, renders the collapse/expand toggle in the header (desktop sidebar only). */
    onToggleCollapse?: () => void
}

/**
 * Sidebar sections, composed from the shared `NAV_ROUTES` config so the
 * desktop sidebar, mobile nav and command palette can never drift apart.
 */
export const SidebarContent = ({ collapsed = false, onToggleCollapse }: SidebarContentProps) => {
    const { role } = useUserRole()
    const prefersReducedMotion = usePrefersReducedMotion()

    const routes = filterByRole(NAV_ROUTES, role)
    const profileItem: NavRoute = { name: 'My Profile', href: role === 'agent' ? '/agents/me' : '/profile', icon: User }

    const byName = (name: string): NavRoute => {
        const found = routes.find((r) => r.name === name)
        if (!found) throw new Error(`Sidebar: route "${name}" not found in NAV_ROUTES`)
        return found
    }

    const engagementNav: NavRoute[] = [
        byName('Visits'),
        byName('Bookings'),
        byName('Discover'),
        ...(role === 'admin'
            ? [byName('Flatmates Moderation'), byName('Flatmates Reports')]
            : []),
    ]

    const adminToolsNav = byName('Admin Tools')

    const sections: NavSection[] = role === 'admin'
        ? [
            { items: [byName('Dashboard')] },
            { label: 'Properties', items: [byName('All Properties')] },
            { label: 'Engagement', items: engagementNav },
            { label: 'Property Management', items: [byName('Property Management')] },
            { label: 'Admin', items: [byName('Users'), byName('Agents'), byName('Analytics'), adminToolsNav] },
            { items: [profileItem] },
        ]
        : role === 'agent'
            ? [
                { items: [byName('Dashboard')] },
                { label: 'Properties', items: [byName('All Properties')] },
                { label: 'Engagement', items: engagementNav },
                { label: 'Property Management', items: [byName('Property Management')] },
                { items: [byName('Users'), profileItem] },
            ]
            : [
                // Non-staff authenticated users only have account routes (App.tsx).
                { items: [profileItem] },
            ]

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
                className={cn(
                    'flex flex-shrink-0 items-center',
                    collapsed ? 'flex-col justify-center gap-2 p-3' : 'justify-between gap-2 p-4 pb-2',
                )}
            >
                {collapsed ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-cohere-md bg-primary text-xs font-semibold text-primary-foreground">
                        360
                    </div>
                ) : prefersReducedMotion ? (
                    <div className="text-lg font-semibold">360 Ghar</div>
                ) : (
                    <GradientText
                        className="text-lg font-semibold"
                        colors={['#ffffff', 'hsl(var(--cohere-action-blue))', '#ffffff']}
                        animationSpeed={6}
                    >
                        360 Ghar
                    </GradientText>
                )}
                {onToggleCollapse && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleCollapse}
                                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {collapsed ? (
                                    <PanelLeftOpen className="h-4 w-4" />
                                ) : (
                                    <PanelLeftClose className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {collapsed ? 'Expand sidebar (⌘\\)' : 'Collapse sidebar (⌘\\)'}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <nav className={cn('flex-1 space-y-4 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-4')}>
                {sections.map((section, idx) => (
                    <div key={idx}>
                        {idx > 0 && <Separator className={collapsed ? 'my-1' : 'mb-3'} />}
                        {section.label && !collapsed && (
                            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {section.label}
                            </div>
                        )}
                        <div className={cn(collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1')}>
                            {section.items.map((item) => (
                                <NavItem
                                    key={item.name}
                                    to={item.href}
                                    label={item.name}
                                    icon={item.icon}
                                    children={item.children}
                                    collapsed={collapsed}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </div>
    )
}
