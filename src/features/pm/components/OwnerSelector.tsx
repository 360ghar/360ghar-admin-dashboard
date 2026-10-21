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
import { useGetUserQuery } from '@/features/users/api/usersApi'
import { isApiError } from '@/lib/errors'

export default function OwnerSelector() {
  const dispatch = useAppDispatch()
  const selected = useAppSelector(selectSelectedOwner)
  const { role } = useUserRole()
  const isAgent = role === 'agent'

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)

  const usersQuery = useOwnersSearch(debouncedQuery, { skip: !open })
  // The search is paginated. Check the selected owner by ID so a missing
  // search row never clears a valid selection.
  const selectedOwnerQuery = useGetUserQuery(selected?.id ?? 0, {
    skip: !isAgent || !selected?.id,
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (!isAgent || !selected?.id || selectedOwnerQuery.originalArgs !== selected.id) return
    if (isApiError(selectedOwnerQuery.error) && [403, 404].includes(selectedOwnerQuery.error.status)) {
      dispatch(setSelectedOwner(null))
    }
  }, [dispatch, isAgent, selected?.id, selectedOwnerQuery.error, selectedOwnerQuery.originalArgs])

  const items = useMemo(() => {
    const owners = (usersQuery.currentData?.items ?? []).filter((u) => u.role === 'user')
    const ownerItems = owners.map((u) => ({ id: u.id, label: getOwnerLabel(u), user: u }))
    if (isAgent) return ownerItems
    return [{ id: null, label: 'All owners' }, ...ownerItems]
  }, [isAgent, usersQuery.currentData?.items])

  // A combobox takes no name from its content, so the name holds the visible text.
  const triggerLabel = selected ? selected.label : isAgent ? 'Select owner…' : 'All owners'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Owner scope: ${triggerLabel}`}
          className="w-[min(280px,42vw)] justify-between"
        >
          <span className="truncate">{triggerLabel}</span>
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
