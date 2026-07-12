import { Link, useParams } from 'react-router-dom'
import AgentList from '../components/AgentList'
import AgentForm from '../components/AgentForm'
import AgentStats from '../components/AgentStats'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Users } from 'lucide-react'

const AgentsPage = ({ mode }: { mode?: 'create' | 'edit' | 'stats' }) => {
  const params = useParams()
  if (mode === 'create') return <AgentForm />
  if (mode === 'edit') return <AgentForm id={Number(params.id)} />
  if (mode === 'stats') return <AgentStats id={Number(params.id)} />
  // list mode
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Manage agents, availability, and performance stats"
        icon={Users}
        badge="Admin View"
        actions={
          <Button asChild className="rounded-cohere-pill">
            <Link to="/agents/new">New Agent</Link>
          </Button>
        }
      />
      <AgentList />
    </div>
  )
}

export default AgentsPage
