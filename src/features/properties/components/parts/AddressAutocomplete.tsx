import { useEffect, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'

type NominatimPlace = {
  place_id: number
  lat: string
  lon: string
  display_name: string
  address?: Record<string, string>
}

const fetchPlaces = async (q: string, signal?: AbortSignal): Promise<NominatimPlace[]> => {
  if (!q || q.trim().length < 3) return []
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('q', q)
  const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' }, signal })
  if (!res.ok) return []
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  return data.filter((item): item is NominatimPlace => {
    if (!item || typeof item !== 'object') return false
    const record = item as Record<string, unknown>
    return typeof record.place_id === 'number'
      && typeof record.lat === 'string'
      && typeof record.lon === 'string'
      && typeof record.display_name === 'string'
  })
}

const AddressAutocomplete = ({ value = '', onSelect }: { value?: string; onSelect: (place: NominatimPlace) => void }) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value)
  const [list, setList] = useState<NominatimPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { setQ(value) }, [value])

  useEffect(() => {
    const controller = new AbortController()
    const run = async () => {
      if (!q || q.trim().length < 3) { setList([]); setFetchError(null); return }
      setLoading(true)
      try {
        const res = await fetchPlaces(q, controller.signal)
        if (!controller.signal.aborted) {
          setList(res)
          setFetchError(null)
        }
      } catch (e) {
        // AbortError is expected when the query changes mid-flight — ignore it.
        if (controller.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
        setFetchError('Failed to fetch addresses. Please try again.')
        setList([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    const t = setTimeout(() => { void run() }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [q])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {q || 'Search address…'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search address…" value={q} onValueChange={setQ} />
            <CommandList>
              <CommandEmpty>{loading ? 'Searching…' : 'No results'}</CommandEmpty>
              <CommandGroup>
                {list.map((p) => (
                  <CommandItem key={p.place_id} onSelect={() => { onSelect(p); setOpen(false) }}>
                    {p.display_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {fetchError && <p className="text-xs text-red-500 mt-1">{fetchError}</p>}
    </>
  )
}

export default AddressAutocomplete
