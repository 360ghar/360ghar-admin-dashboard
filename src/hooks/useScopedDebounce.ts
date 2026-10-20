import { useMemo } from 'react'
import { useDebounce } from './useDebounce'

/** Keep a delayed search value from crossing an account boundary. */
export function useScopedDebounce(value: string, scope: string | null | undefined, delay = 300) {
  const input = useMemo(() => ({ scope, value }), [scope, value])
  const delayed = useDebounce(input, delay)
  return delayed.scope === scope ? delayed.value : value
}
