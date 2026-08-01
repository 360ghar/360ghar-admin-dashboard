import { useUserRole } from '@/hooks/useUserRole'
import { NavItem } from './NavItem'
import { Separator } from '@/components/ui/separator'
import { filterByRole, NAV_ROUTES, type NavRoute } from './navConfig'
import { User } from 'lucide-react'

interface NavSection {
    label?: string
    items: NavRoute[]
}

/**
 * Sidebar sections, composed from the shared `NAV_ROUTES` config so the
 * desktop sidebar, mobile nav and command palette can never drift apart.
 */
export const SidebarContent = () => {
    const { role } = useUserRole()

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
        <div className="flex h-full flex-col">
            <div className="flex-shrink-0 p-4 pb-2">
                <div className="text-lg font-semibold">360 Ghar</div>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        {idx > 0 && <Separator className="mb-3" />}
                        {section.label && (
                            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {section.label}
                            </div>
                        )}
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <NavItem
                                    key={item.name}
                                    to={item.href}
                                    label={item.name}
                                    icon={item.icon}
                                    children={item.children}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </div>
    )
}
