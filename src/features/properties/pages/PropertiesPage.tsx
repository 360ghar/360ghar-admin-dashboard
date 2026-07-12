import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import PropertyList from '../components/PropertyList'
import PropertyForm from '../components/PropertyForm'
import PropertyDetail from '../components/PropertyDetail'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Building2, Plus } from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { PropertyQuickStats } from '../components/PropertyQuickStats'

type Props = { mode?: 'create' | 'edit' | 'view' }

function parseRouteId(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

const PropertiesPage = ({ mode }: Props) => {
  const params = useParams()
  const navigate = useNavigate()
  const { role } = useUserRole()

  if (mode === 'create') {
    return <PropertyForm onSuccess={(id) => navigate(`/properties/${id}`)} />
  }
  if (mode === 'edit') {
    const id = parseRouteId(params.id)
    if (id == null) return <Navigate to="/properties" replace />
    return <PropertyForm id={id} onSuccess={(pid) => navigate(`/properties/${pid}`)} />
  }
  if (mode === 'view') {
    const id = parseRouteId(params.id)
    if (id == null) return <Navigate to="/properties" replace />
    return <PropertyDetail id={id} />
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="space-y-4">
          <PageHeader
            title="Properties"
            description={
              role === 'agent'
                ? 'Manage properties assigned to you and track their performance'
                : 'Manage all properties in the system and oversee the real estate portfolio'
            }
            icon={Building2}
            badge={role === 'admin' ? 'Admin View' : 'Agent View'}
            actions={
              <Button asChild className="gap-2 rounded-cohere-pill">
                <Link to="/properties/new">
                  <Plus className="h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            }
          />
          <PropertyQuickStats />
        </div>

        <PropertyList />
      </div>
    </ErrorBoundary>
  )
}

export default PropertiesPage
