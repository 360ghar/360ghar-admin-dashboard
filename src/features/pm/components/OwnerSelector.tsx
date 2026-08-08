import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { useUserRole } from '@/hooks/useUserRole'
import { useDebounce } from '@/hooks/useDebounce'
import { useOwnersSearch } from '@/features/pm/hooks/useOwnersSearch'
import { setSelectedOwner, selectSelectedOwner } from '@/features/pm/slices/pmSlice'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getOwnerLabel } from '@/features/pm/utils'

export default function OwnerSelector() {
  const dispatch = useAppDispatch()
  const selected = useAppSelector(selectSelectedOwner)
  const { role } = useUserRole()
  const isAgent = role === 'agent'

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)

  const usersQuery = useOwnersSearch(debouncedQuery, { skip: !open })

  const items = useMemo(() => {
    const owners = (usersQuery.data?.items ?? []).filter((u) => u.role === 'user')
    const ownerItems = owners.map((u) => ({ id: u.id, label: getOwnerLabel(u), user: u }))
    if (isAgent) return ownerItems
    return [{ id: null, label: 'All owners' }, ...ownerItems]
  }, [isAgent, usersQuery.data?.items])

  useEffect(() => {
    if (!isAgent) return
    if (!selected?.id) return
    if (usersQuery.isFetching || !usersQuery.data) return
    const accessibleIds = new Set(items.map((i) => i.id).filter((id): id is number => typeof id === 'number'))
    if (!accessibleIds.has(selected.id)) dispatch(setSelectedOwner(null))
  }, [dispatch, isAgent, items, selected?.id, usersQuery.data, usersQuery.isFetching])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <span className="truncate">
            {selected
              ? selected.label
              : isAgent
                ? 'Select owner…'
                : 'All owners'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Owner scope</span>
          </div>
          <CommandInput
            placeholder="Search owners by name/phone…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {usersQuery.isFetching ? 'Searching…' : 'No owners found.'}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={String(item.id ?? 'all')}
                  onSelect={() => {
                    if (item.id === null) {
                      dispatch(setSelectedOwner(null))
                      setOpen(false)
                      return
                    }
                    dispatch(setSelectedOwner({ id: item.id, label: item.label }))
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      (item.id === null && !selected) || item.id === selected?.id
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
