import { Link } from 'react-router-dom'
import { CalendarPlus, Heart, Plus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Magnet from '@/components/reactbits/Magnet'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export function QuickActions({ role }: { role?: string | null }) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const actions = (
    <div className="flex flex-wrap gap-3">
      {prefersReducedMotion ? (
        <Button asChild className="rounded-cohere-pill">
          <Link to="/properties/new">
            <Plus className="h-4 w-4" />
            New Property
          </Link>
        </Button>
      ) : (
        <Magnet padding={40} magnetStrength={4} wrapperClassName="rounded-cohere-pill">
          <Button asChild className="rounded-cohere-pill shadow-[0_4px_24px_-6px_hsl(var(--cohere-action-blue)/0.5)]">
            <Link to="/properties/new">
              <Plus className="h-4 w-4" />
              New Property
            </Link>
          </Button>
        </Magnet>
      )}
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

  if (prefersReducedMotion) return actions

  return (
    <FadeContent container="#main-content" threshold={0} duration={600} delay={200}>
      {actions}
    </FadeContent>
  )
}
