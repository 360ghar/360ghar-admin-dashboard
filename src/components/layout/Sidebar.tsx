import { SidebarContent } from './SidebarContent'

/**
 * Sidebar component - Desktop only.
 * Mobile navigation is handled by:
 * - TopBar hamburger menu (slide-out sheet)
 * - BottomNav (fixed bottom navigation bar)
 */
const Sidebar = () => {
  return (
    <div className="hidden md:flex md:flex-col w-64 flex-shrink-0 border-r border-cohere-card-border bg-card/50 backdrop-blur-xl h-full overflow-hidden">
      <SidebarContent />
    </div>
  )
}

export default Sidebar
