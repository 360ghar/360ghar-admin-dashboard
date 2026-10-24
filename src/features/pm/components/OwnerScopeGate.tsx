import type { PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { selectSelectedOwner } from '@/features/pm/slices/pmSlice'
import { EmptyState } from '@/components/ui/empty-state'

type Props = PropsWithChildren<{
  allowAllOwners?: boolean
  title?: string
  description?: string
}>

export default function OwnerScopeGate({
  allowAllOwners = false,
  title = 'Select an owner to continue',
  description = 'Choose an owner from the Owner Selector in the top bar to scope this module.',
  children,
}: Props) {
  const navigate = useNavigate()
  const { role } = useUserRole()
  const selectedOwner = useAppSelector(selectSelectedOwner)

  if (role !== 'agent') return children
  if (allowAllOwners) return children
  if (selectedOwner?.id) return children

  return (
    <EmptyState
      title={title}
      description={description}
      action={{ label: 'Go to Owners', onClick: () => void navigate('/pm/owners') }}
    />
  )
}
