import { Link, useParams, useSearchParams } from 'react-router-dom'
import VisitList from '../components/VisitList'
import VisitForm from '../components/VisitForm'
import VisitDetail from '../components/VisitDetail'
import VisitManagementPage from './VisitManagementPage'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Calendar, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const VisitsPage = ({ mode }: { mode?: 'create' | 'detail' }) => {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'manage' ? 'manage' : 'list'

  if (mode === 'create') return <VisitForm />
  if (mode === 'detail') return <VisitDetail id={Number(params.id)} />

  const setView = (next: 'list' | 'manage') => {
    if (next === 'list') {
      searchParams.delete('view')
      setSearchParams(searchParams, { replace: true })
    } else {
      setSearchParams({ view: 'manage' }, { replace: true })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visits"
        description="Track, schedule, and manage property visits"
        icon={Calendar}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-cohere-pill border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'rounded-cohere-pill px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView('manage')}
                className={cn(
                  'rounded-cohere-pill px-3 py-1.5 text-sm font-medium transition-colors',
                  view === 'manage' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Manage
              </button>
            </div>
            {view === 'list' && (
              <Button asChild className="gap-2 rounded-cohere-pill">
                <Link to="/visits/new">
                  <Plus className="h-4 w-4" />
                  Schedule Visit
                </Link>
              </Button>
            )}
          </div>
        }
      />
      {view === 'manage' ? <VisitManagementPage embedded /> : <VisitList />}
    </div>
  )
}

export default VisitsPage
