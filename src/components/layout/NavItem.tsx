import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
    /** Icon-rail mode: hide labels, show tooltips + hover flyouts for children. */
    collapsed?: boolean
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

// Every collapsible NavItem instance reads this on mount and on toggle; cache
// the parsed set in module scope so a sidebar with N expandable groups does
// one localStorage read/parse per session instead of one per instance.
let cachedExpandedState: Set<string> | null = null

function getExpandedState(): Set<string> {
    if (cachedExpandedState === null) {
        const stored = readJSON<string[] | null>(STORAGE_KEY, null, isStringArray)
        cachedExpandedState = new Set(stored ?? [])
    }
    return cachedExpandedState
}

function saveExpandedState(expanded: Set<string>) {
    cachedExpandedState = expanded
    writeJSON(STORAGE_KEY, [...expanded])
}

function hasActiveChild(children: NavChild[], pathname: string): boolean {
    return children.some(child =>
        isPathActive(pathname, child.href) ||
        (child.children ? hasActiveChild(child.children, pathname) : false)
    )
}

interface FlyoutLinksProps {
    items: NavChild[]
    pathname: string
    onNavigate: () => void
}

/** Recursive flat list for the collapsed-rail flyout: groups become micro-labels. */
const FlyoutLinks = ({ items, pathname, onNavigate }: FlyoutLinksProps) => {
    return (
        <div className="space-y-0.5">
            {items.map((item) => {
                const active = isPathActive(pathname, item.href)
                if (item.children && item.children.length > 0) {
                    return (
                        <div key={item.href}>
                            <div className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {item.name}
                            </div>
                            <FlyoutLinks items={item.children} pathname={pathname} onNavigate={onNavigate} />
                        </div>
                    )
                }
                return (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onNavigate}
                        className={cn(
                            'flex items-center gap-2 rounded-cohere-sm px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                                ? 'bg-accent/60 text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                        )}
                    >
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.name}</span>
                    </NavLink>
                )
            })}
        </div>
    )
}

export const NavItem = ({ to, label, icon: Icon, children, depth = 0, collapsed = false }: NavItemProps) => {
    const location = useLocation()
    const isChildActive = children ? hasActiveChild(children, location.pathname) : false

    const [isOpen, setIsOpen] = useState(() => {
        const expanded = getExpandedState()
        return expanded.has(label) || isChildActive
    })

    // Collapsed-rail flyout state.
    const [flyoutOpen, setFlyoutOpen] = useState(false)
    const openTimerRef = useRef<number | null>(null)
    const closeTimerRef = useRef<number | null>(null)
    const flyoutRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isChildActive && !isOpen) {
            setIsOpen(true)
        }
    }, [isChildActive, isOpen])

    // Close the flyout on navigation or when leaving rail mode.
    useEffect(() => {
        setFlyoutOpen(false)
    }, [location.pathname, collapsed])

    // Clear any pending flyout timers on unmount.
    useEffect(() => {
        return () => {
            if (openTimerRef.current !== null) clearTimeout(openTimerRef.current)
            if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
        }
    }, [])

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

    const clearFlyoutTimers = useCallback(() => {
        if (openTimerRef.current !== null) {
            clearTimeout(openTimerRef.current)
            openTimerRef.current = null
        }
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current)
            closeTimerRef.current = null
        }
    }, [])

    /** Immediate open (click, keyboard focus, or the cursor reaching the flyout). */
    const openFlyout = useCallback(() => {
        clearFlyoutTimers()
        setFlyoutOpen(true)
    }, [clearFlyoutTimers])

    // Delayed hover-open so sweeping the cursor down the rail doesn't pop
    // every flyout; a pending open is cancelled if the cursor leaves first.
    const scheduleOpen = useCallback(() => {
        if (openTimerRef.current !== null) return
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current)
            closeTimerRef.current = null
        }
        openTimerRef.current = window.setTimeout(() => {
            openTimerRef.current = null
            setFlyoutOpen(true)
        }, 150)
    }, [])

    // Grace period so the cursor can travel from the rail into the flyout.
    const scheduleClose = useCallback(() => {
        if (closeTimerRef.current !== null) return
        if (openTimerRef.current !== null) {
            clearTimeout(openTimerRef.current)
            openTimerRef.current = null
        }
        closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null
            setFlyoutOpen(false)
        }, 250)
    }, [])

    // Keep the flyout open while keyboard focus is inside it.
    const handleBlur = useCallback((e: React.FocusEvent) => {
        if (e.relatedTarget instanceof Node && flyoutRef.current?.contains(e.relatedTarget)) {
            return
        }
        scheduleClose()
    }, [scheduleClose])

    const isActive = isPathActive(location.pathname, to)
    const iconSize = depth === 0 ? 'h-4 w-4' : depth === 1 ? 'h-3.5 w-3.5' : 'h-3 w-3'
    const paddingLeft = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : 'pl-9'

    // Icon-rail mode: leaf items are tooltip-wrapped icon buttons.
    if (collapsed) {
        const railClasses = cn(
            'relative flex w-full items-center justify-center rounded-cohere-md p-2 transition-colors',
            isChildActive || isActive
                ? 'bg-accent/60 text-accent-foreground shadow-[inset_2px_0_0_0_hsl(var(--cohere-coral))]'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        )

        if (children && children.length > 0) {
            return (
                <Popover
                    open={flyoutOpen}
                    onOpenChange={(open) => {
                        // Radix dismissals (click on the trigger, outside click,
                        // Escape) must cancel a pending hover-open timer too.
                        if (!open && openTimerRef.current !== null) {
                            clearTimeout(openTimerRef.current)
                            openTimerRef.current = null
                        }
                        setFlyoutOpen(open)
                    }}
                >
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label={label}
                            aria-haspopup="dialog"
                            aria-expanded={flyoutOpen}
                            onMouseEnter={scheduleOpen}
                            onMouseLeave={scheduleClose}
                            onFocus={openFlyout}
                            onBlur={handleBlur}
                            className={railClasses}
                        >
                            <Icon className="h-4 w-4" />
                            <ChevronRight className="absolute right-0.5 h-3 w-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        ref={flyoutRef}
                        side="right"
                        align="start"
                        sideOffset={10}
                        onMouseEnter={openFlyout}
                        onMouseLeave={scheduleClose}
                        className="w-64 p-2"
                    >
                        <div className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                            {label}
                        </div>
                        <FlyoutLinks
                            items={children}
                            pathname={location.pathname}
                            onNavigate={() => setFlyoutOpen(false)}
                        />
                    </PopoverContent>
                </Popover>
            )
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <NavLink to={to} aria-label={label} className={railClasses}>
                        <Icon className="h-4 w-4" />
                    </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        )
    }

    if (children && children.length > 0) {
        return (
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger
                    className={cn(
                        'flex w-full items-center gap-2 rounded-cohere-md pr-3 py-2 text-sm font-medium transition-colors',
                        paddingLeft,
                        isChildActive
                            ? 'bg-accent/60 text-accent-foreground shadow-[inset_2px_0_0_0_hsl(var(--cohere-coral))]'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
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
                'flex items-center gap-2 rounded-cohere-md pr-3 py-2 text-sm font-medium transition-colors',
                paddingLeft,
                isActive
                    ? 'bg-accent/60 text-accent-foreground shadow-[inset_2px_0_0_0_hsl(var(--cohere-coral))]'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
        >
            <Icon className={iconSize} />
            <span>{label}</span>
        </NavLink>
    )
}
