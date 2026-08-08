import { useListPmPropertiesQuery } from '@/features/pm/api/pmApi'

/**
 * The 200-row property list used to populate a "pick a property" select —
 * deferred until the caller says the dialog holding it is actually open.
 */
export function usePmPropertyOptions(ownerId: number | null, { enabled }: { enabled: boolean }) {
  return useListPmPropertiesQuery({ owner_id: ownerId, limit: 200 }, { skip: !enabled })
}
