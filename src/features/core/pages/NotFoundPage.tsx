import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'
import GlitchText from '@/components/reactbits/GlitchText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const NotFoundPage = () => {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-full max-w-md rounded-cohere-md border border-cohere-card-border bg-card/60 backdrop-blur-md p-10">
        <div className="space-y-2">
          {prefersReducedMotion ? (
            <p className="text-6xl font-semibold tracking-tight text-muted-foreground">404</p>
          ) : (
            <GlitchText className="!text-6xl">404</GlitchText>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="max-w-md text-muted-foreground">
            The page you’re looking for doesn’t exist or may have moved.
          </p>
        </div>
        <Button asChild className="rounded-cohere-pill">
          <Link to="/dashboard">
            <Compass className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFoundPage
