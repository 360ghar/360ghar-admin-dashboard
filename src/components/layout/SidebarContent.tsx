import { useUserRole } from '@/hooks/useUserRole'
import {
    Home,
    Building,
    Users,
    Calendar,
    BookOpen,
    User,
    BarChart3,
    FileText,
    AlertCircle,
    Settings,
    Smartphone,
    Folder,
    Tag,
    Bell,
    Heart,
    ClipboardList,
    Receipt,
    Wrench,
    FileSearch,
    ClipboardCheck,
    FileBarChart,
    Briefcase,
    HardHat,
    HelpCircle,
} from 'lucide-react'
import { NavItem, type NavChild } from './NavItem'
import { Separator } from '@/components/ui/separator'

interface NavItemConfig {
    name: string
    href: string
    icon: typeof Home
    children?: NavChild[]
}

interface NavSection {
    label?: string
    items: NavItemConfig[]
}

export const SidebarContent = () => {
    const { role } = useUserRole()

    const pmChildren: NavChild[] = [
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
            ]
        },
        {
            name: 'Operations',
            href: '/pm/maintenance',
            icon: HardHat,
            children: [
                { name: 'Maintenance', href: '/pm/maintenance', icon: Wrench },
                { name: 'Inspections', href: '/pm/inspections', icon: ClipboardCheck },
                { name: 'Expenses', href: '/pm/expenses', icon: Receipt },
            ]
        },
        { name: 'Documents', href: '/pm/documents', icon: Folder },
        { name: 'Reports', href: '/pm/reports', icon: FileBarChart },
    ]
    if (role === 'admin') {
        pmChildren.push(
            { name: 'Audit Log', href: '/pm/audit', icon: FileText },
            { name: 'Settings', href: '/pm/settings', icon: Settings },
        )
    }

    const pmNav: NavItemConfig = {
        name: 'Property Management',
        href: '/pm/dashboard',
        icon: ClipboardList,
        children: pmChildren,
    }

    const propertiesNav: NavItemConfig[] = [
        { name: 'All Properties', href: '/properties', icon: Building },
    ]

    const engagementNav: NavItemConfig[] = [
        { name: 'Visits', href: '/visits', icon: Calendar },
        { name: 'Bookings', href: '/bookings', icon: BookOpen },
        { name: 'Discover', href: '/swipes', icon: Heart },
        ...(role === 'admin'
            ? [
                { name: 'Flatmates Moderation', href: '/flatmates/moderation', icon: ClipboardCheck },
                { name: 'Flatmates Reports', href: '/flatmates/reports', icon: AlertCircle },
            ]
            : []),
    ]

    // Parent href is the first child — collapsible parents are not links themselves.
    const adminToolsNav: NavItemConfig = {
        name: 'Admin Tools',
        href: '/bug-reports',
        icon: Settings,
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
                ]
            },
            { name: 'Pages', href: '/pages', icon: FileText },
            { name: 'FAQs', href: '/faqs', icon: HelpCircle },
            { name: 'App Updates', href: '/app-updates', icon: Smartphone },
        ]
    }

    const profileItem: NavItemConfig = { name: 'My Profile', href: role === 'agent' ? '/agents/me' : '/profile', icon: User }

    const sections: NavSection[] = role === 'admin'
        ? [
            { items: [{ name: 'Dashboard', href: '/dashboard', icon: Home }] },
            { label: 'Properties', items: propertiesNav },
            { label: 'Engagement', items: engagementNav },
            { label: 'Property Management', items: [pmNav] },
            { label: 'Admin', items: [
                { name: 'Users', href: '/users', icon: Users },
                { name: 'Agents', href: '/agents', icon: User },
                { name: 'Analytics', href: '/analytics', icon: BarChart3 },
                adminToolsNav
            ]},
            { items: [profileItem] },
        ]
        : role === 'agent'
            ? [
                { items: [{ name: 'Dashboard', href: '/dashboard', icon: Home }] },
                { label: 'Properties', items: propertiesNav },
                { label: 'Engagement', items: engagementNav },
                { label: 'Property Management', items: [pmNav] },
                { items: [{ name: 'Users', href: '/users', icon: Users }, profileItem] },
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
