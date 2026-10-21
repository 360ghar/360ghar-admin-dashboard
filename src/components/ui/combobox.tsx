import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboItem<T extends string | number> = { value: T | ''; label: string }

type Props<T extends string | number> = {
  items: ComboItem<T>[]
  value?: T | ''
  onChange: (v: T | '') => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function Combobox<T extends string | number>({ items, value = '', onChange, placeholder = 'Search…', emptyText = 'No results', className, disabled = false }: Props<T>) {
  const [open, setOpen] = React.useState(false)
  const selected = items.find((i) => String(i.value) === String(value))
  const isOpen = !disabled && open
  // A disabled combobox closes, so enabling it again does not reopen the list.
  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <Popover open={isOpen} onOpenChange={(nextOpen) => { if (!disabled) setOpen(nextOpen) }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={isOpen} disabled={disabled} className={cn('w-full justify-between', className)}>
          {selected ? selected.label : 'Select…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={String(item.value)} onSelect={() => { if (disabled) return; onChange(item.value); setOpen(false) }}>
                  <Check className={cn('mr-2 h-4 w-4', String(item.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default Combobox
