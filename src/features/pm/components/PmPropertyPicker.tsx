import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useListPmPropertiesQuery } from '@/features/pm/api/pmApi'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import type { PmProperty } from '@/types/pm'

/** Rows one search returns. The list is a search result, never the whole portfolio. */
const PICKER_PAGE_SIZE = 20

interface PmPropertyPickerProps {
  ownerId: number | null
  /** The chosen property. The parent keeps it, so the label and the owner survive a new search. */
  selected: PmProperty | null
  onSelect: (property: PmProperty | null) => void
  /** Read nothing until true (a closed dialog must not load properties). */
  enabled: boolean
  /** Adds a first row that clears the choice, for an optional property. */
  clearLabel?: string
  placeholder?: string
}

/**
 * Pick one managed property. The search runs on the server (`q` matches title and address), so an owner
 * or an admin with thousands of properties never loads them all: one page of 20 per search.
 */
export function PmPropertyPicker({
  ownerId,
  selected,
  onSelect,
  enabled,
  clearLabel,
  placeholder = 'Select property…',
}: PmPropertyPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)

  const properties = useListPmPropertiesQuery(
    { owner_id: ownerId, q: debouncedSearch || undefined, limit: PICKER_PAGE_SIZE },
    { skip: !open || !enabled },
  )
  const items = properties.currentData?.items ?? []
  const typing = search.trim() !== debouncedSearch

  const choose = (property: PmProperty | null) => {
    onSelect(property)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Property" className="w-full justify-between font-normal">
          <span className="truncate">
            {selected ? `#${selected.id} • ${selected.title}` : (clearLabel ?? placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by title or address…" value={search} onValueChange={setSearch} />
          <CommandList>
            {properties.isError ? (
              <div role="alert" className="p-3 text-sm text-destructive">
                Could not load properties.{' '}
                <button type="button" className="underline" onClick={() => void properties.refetch()}>
                  Retry
                </button>
              </div>
            ) : (!properties.currentData && properties.isFetching) || typing ? (
              <div role="status" className="p-3 text-sm text-muted-foreground">Searching…</div>
            ) : (
              <>
                {items.length === 0 && !clearLabel ? <CommandEmpty>No properties found.</CommandEmpty> : null}
                <CommandGroup>
                  {clearLabel ? (
                    <CommandItem value="__clear" onSelect={() => choose(null)}>
                      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-0' : 'opacity-100')} />
                      {clearLabel}
                    </CommandItem>
                  ) : null}
                  {items.map((p) => (
                    <CommandItem key={p.id} value={String(p.id)} onSelect={() => choose(p)}>
                      <Check className={cn('mr-2 h-4 w-4', selected?.id === p.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">#{p.id} • {p.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {items.length === 0 && clearLabel ? (
                  <div className="p-3 text-sm text-muted-foreground">No properties found.</div>
                ) : null}
                {properties.currentData?.has_more ? (
                  <div className="border-t p-2 text-xs text-muted-foreground">Showing the first {PICKER_PAGE_SIZE}. Type to narrow the search.</div>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
