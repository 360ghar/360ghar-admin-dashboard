import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useSidebar,
} from '@/hooks/useSidebar'
import { SidebarContent } from './SidebarContent'
import { cn } from '@/lib/utils'

const RESIZE_STEP = 16

/**
 * Sidebar component - Desktop only (hidden below md).
 * - Collapsible to a 68px icon rail (toggle in the header, ⌘\ shortcut).
 * - Width adjustable by dragging the right-edge handle (224–400px,
 *   double-click resets, arrow keys nudge). Both prefs persist.
 * Mobile navigation is handled by TopBar/BottomNav (SidebarContent sheet).
 */
const Sidebar = () => {
  const { collapsed, width, toggleCollapsed, setWidth, resetWidth } = useSidebar()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  // Sidebar's left edge captured at drag start (layout doesn't move during a drag).
  const dragStartLeftRef = useRef(0)

  // Track pointer moves on window while dragging; clamp to min/max.
  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      setWidth(e.clientX - dragStartLeftRef.current)
    }
    const onEnd = () => setIsDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    // Touch gestures can be cancelled by the browser mid-drag — end it then too.
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [isDragging, setWidth])

  // Block text selection + keep the resize cursor while dragging.
  useEffect(() => {
    if (!isDragging) return
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setWidth(width - RESIZE_STEP)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setWidth(width + RESIZE_STEP)
    } else if (e.key === 'Home') {
      e.preventDefault()
      resetWidth()
    }
  }

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'relative hidden h-full flex-shrink-0 flex-col overflow-hidden border-r border-cohere-card-border bg-card/50 backdrop-blur-xl md:flex',
        // Width animates on collapse/expand, but never while dragging (laggy).
        !isDragging && !prefersReducedMotion && 'transition-[width] duration-200 ease-in-out',
      )}
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : width }}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />

      {/* Resize handle (expanded only) */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar width"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            dragStartLeftRef.current = sidebarRef.current?.getBoundingClientRect().left ?? 0
            setIsDragging(true)
          }}
          onDoubleClick={resetWidth}
          onKeyDown={handleKeyDown}
          className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none outline-none transition-colors hover:bg-cohere-action-blue/40 focus-visible:bg-cohere-action-blue/60"
          title="Drag to resize · double-click to reset · Home resets"
        />
      )}
    </div>
  )
}

export default Sidebar
