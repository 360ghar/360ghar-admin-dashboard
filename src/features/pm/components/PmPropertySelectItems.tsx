import { SelectItem } from '@/components/ui/select'
import type { PmProperty } from '@/types/pm'
import type { PaginatedResponse } from '@/types/api'

interface PmPropertySelectItemsProps {
  properties: { data?: PaginatedResponse<PmProperty>; isLoading: boolean; isError: boolean }
}

/** Loading/error/empty/list branches for a "pick a property" Select, shared by the PM create dialogs. */
export function PmPropertySelectItems({ properties }: PmPropertySelectItemsProps) {
  if (properties.isLoading) {
    return <SelectItem value="loading" disabled>Loading properties…</SelectItem>
  }
  if (properties.isError) {
    return <SelectItem value="error" disabled>Failed to load properties</SelectItem>
  }
  if (!properties.data?.items?.length) {
    return <SelectItem value="none" disabled>No properties available</SelectItem>
  }
  return (
    <>
      {properties.data.items.map((p) => (
        <SelectItem key={p.id} value={String(p.id)}>
          #{p.id} • {p.title}
        </SelectItem>
      ))}
    </>
  )
}
