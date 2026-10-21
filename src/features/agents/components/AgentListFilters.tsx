import { Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MobileFilters, FilterSection } from '@/components/ui/mobile-filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePageSizePreference'

export type AgentStatus = 'all' | 'active' | 'inactive'

interface AgentListFiltersProps {
  query: string
  status: AgentStatus
  pageSize: number
  onQueryChange: (value: string) => void
  onStatusChange: (value: AgentStatus) => void
  onPageSizeChange: (value: number) => void
  onClear: () => void
  onExport: () => void
  exportDisabled: boolean
}

export function AgentListFilters({
  query, status, pageSize, onQueryChange, onStatusChange, onPageSizeChange, onClear, onExport, exportDisabled,
}: AgentListFiltersProps) {
  const activeCount = (query ? 1 : 0) + (status !== 'all' ? 1 : 0)
  const search = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input placeholder="Search agent name or contact" value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-10" aria-label="Search agents" />
    </div>
  )
  const statusSelect = (
    <Select value={status} onValueChange={(value) => onStatusChange(value as AgentStatus)}>
      <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  )
  const pageSizeSelect = (
    <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
      <SelectTrigger aria-label="Page size"><SelectValue placeholder="Rows" /></SelectTrigger>
      <SelectContent>
        {PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}
      </SelectContent>
    </Select>
  )

  return (
    <>
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <MobileFilters activeCount={activeCount} onClear={onClear} title="Agent filters">
          <FilterSection label="Search">{search}</FilterSection>
          <FilterSection label="Status">{statusSelect}</FilterSection>
          <FilterSection label="Rows per page">{pageSizeSelect}</FilterSection>
        </MobileFilters>
        <Button variant="outline" size="sm" onClick={onExport} disabled={exportDisabled} className="ml-auto gap-2"><Download className="h-4 w-4" aria-hidden />Export</Button>
      </div>
      <div className="mb-4 hidden gap-3 md:grid md:grid-cols-5">
        <div className="md:col-span-2">{search}</div>
        {statusSelect}
        {pageSizeSelect}
        <Button variant="outline" size="sm" onClick={onExport} disabled={exportDisabled} className="gap-2"><Download className="h-4 w-4" aria-hidden />Export</Button>
      </div>
    </>
  )
}
