import { useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { readJSON, writeJSON } from '@/lib/storage'

export interface NavChild {
    name: string
    href: string
    icon: LucideIcon
    children?: NavChild[]
}

export interface NavItemProps {
    to: string
    label: string
    icon: LucideIcon
    children?: NavChild[]
    depth?: number
}

const STORAGE_KEY = 'sidebar-expanded'

/** Static subpaths that must not activate a sibling/parent list route. */
const NON_NESTED_SEGMENTS: Record<string, ReadonlySet<string>> = {
    '/users': new Set(['preferences', 'profile']),
    '/blogs': new Set(['categories', 'tags']),
    '/agents': new Set(['me', 'dashboard']),
    '/visits': new Set(['manage']),
    '/bookings': new Set(['manage']),
}

/**
 * Whether `pathname` should highlight the nav item for `href`.
 * Exact match always wins; prefix match is used for nested resource routes
 * (e.g. /properties/123) but not for static sibling routes that share a prefix
 * (e.g. /blogs vs /blogs/categories, /users vs /users/preferences).
 */
export function isPathActive(pathname: string, href: string): boolean {
    if (pathname === href) return true
    if (!pathname.startsWith(href + '/')) return false

    const firstSegment = pathname.slice(href.length + 1).split('/')[0]
    const excluded = NON_NESTED_SEGMENTS[href]
    if (excluded?.has(firstSegment)) return false
    return true
}

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')

function getExpandedState(): Set<string> {
    const stored = readJSON<string[] | null>(STORAGE_KEY, null, isStringArray)
    return new Set(stored ?? [])
}

function saveExpandedState(expanded: Set<string>) {
    writeJSON(STORAGE_KEY, [...expanded])
}

function hasActiveChild(children: NavChild[], pathname: string): boolean {
    return children.some(child =>
        isPathActive(pathname, child.href) ||
        (child.children ? hasActiveChild(child.children, pathname) : false)
    )
}

export const NavItem = ({ to, label, icon: Icon, children, depth = 0 }: NavItemProps) => {
    const location = useLocation()
    const isChildActive = children ? hasActiveChild(children, location.pathname) : false
    
    const [isOpen, setIsOpen] = useState(() => {
        const expanded = getExpandedState()
        return expanded.has(label) || isChildActive
    })

    useEffect(() => {
        if (isChildActive && !isOpen) {
            setIsOpen(true)
        }
    }, [isChildActive, isOpen])

    const handleToggle = useCallback((open: boolean) => {
        setIsOpen(open)
        const expanded = getExpandedState()
        if (open) {
            expanded.add(label)
        } else {
            expanded.delete(label)
        }
        saveExpandedState(expanded)
    }, [label])

    const isActive = isPathActive(location.pathname, to)
    const iconSize = depth === 0 ? 'h-4 w-4' : depth === 1 ? 'h-3.5 w-3.5' : 'h-3 w-3'
    const paddingLeft = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : 'pl-9'

    if (children && children.length > 0) {
        return (
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger
                    className={cn(
                        'flex w-full items-center gap-2 rounded-md pr-3 py-2 text-sm font-medium transition-colors',
                        paddingLeft,
                        isChildActive
                            ? 'bg-accent/50 text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                >
                    <Icon className={iconSize} />
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronRight 
                        className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            isOpen && 'rotate-90'
                        )} 
                    />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="mt-1 space-y-1 border-l border-border/50 ml-5">
                        {children.map((child) => (
                            <NavItem
                                key={`${child.name}-${child.href}`}
                                to={child.href}
                                label={child.name}
                                icon={child.icon}
                                children={child.children}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )
    }

    return (
        <NavLink
            to={to}
            className={cn(
                'flex items-center gap-2 rounded-md pr-3 py-2 text-sm font-medium transition-colors',
                paddingLeft,
                isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
        >
            <Icon className={iconSize} />
            <span>{label}</span>
        </NavLink>
    )
}
