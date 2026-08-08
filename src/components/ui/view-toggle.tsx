import * as React from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { readJSON, writeJSON } from '@/lib/storage'

export type ViewMode = 'table' | 'cards'

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
  className?: string
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center border rounded-md', className)}>
      <Button
        variant={view === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-r-none border-0"
        onClick={() => onChange('table')}
        aria-label="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-l-none border-0"
        onClick={() => onChange('cards')}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Hook to persist view mode preference in localStorage
 */
export function useViewMode(key: string, defaultView: ViewMode = 'table'): [ViewMode, (view: ViewMode) => void] {
  const storageKey = `view-mode-${key}`
  const isViewMode = (value: unknown): value is ViewMode => value === 'table' || value === 'cards'

  const [view, setViewState] = React.useState<ViewMode>(() =>
    readJSON(storageKey, defaultView, isViewMode),
  )

  const setView = (newView: ViewMode) => {
    setViewState(newView)
    writeJSON(storageKey, newView)
  }

  return [view, setView]
}
