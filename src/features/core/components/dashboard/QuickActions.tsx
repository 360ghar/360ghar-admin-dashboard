import { Link } from 'react-router-dom'
import { CalendarPlus, Heart, Plus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuickActions({ role }: { role?: string | null }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild className="rounded-cohere-pill">
        <Link to="/properties/new">
          <Plus className="h-4 w-4" />
          New Property
        </Link>
      </Button>
      <Button asChild variant="outline" className="rounded-cohere-pill">
        <Link to="/visits/new">
          <CalendarPlus className="h-4 w-4" />
          Schedule Visit
        </Link>
      </Button>
      <Button asChild variant="outline" className="rounded-cohere-pill">
        <Link to="/swipes">
          <Heart className="h-4 w-4" />
          Discover
        </Link>
      </Button>
      {role === 'admin' && (
        <Button asChild variant="outline" className="rounded-cohere-pill">
          <Link to="/notifications">
            <Send className="h-4 w-4" />
            Compose Notification
          </Link>
        </Button>
      )}
    </div>
  )
}
