import type { ReactNode } from 'react'
import { Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SplitText from '@/components/reactbits/SplitText'
import ShinyText from '@/components/reactbits/ShinyText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface AuthCardLayoutProps {
  title: string
  subtitle?: string
  errorMessage?: string | null
  infoMessage?: string | null
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared card layout for auth pages (login, signup, forgot-password).
 * Provides the centered glass card with icon, animated title, alerts,
 * and optional footer.
 */
export function AuthCardLayout({
  title,
  subtitle,
  errorMessage,
  infoMessage,
  children,
  footer,
}: AuthCardLayoutProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-background bg-[radial-gradient(800px_400px_at_50%_-10%,hsl(var(--cohere-action-blue)/0.1),transparent_65%)]">
      <Card className="w-full max-w-md border border-cohere-card-border bg-card/70 backdrop-blur-xl card-glow">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          {prefersReducedMotion ? (
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          ) : (
            <SplitText
              text={title}
              tag="h2"
              splitType="chars"
              delay={16}
              duration={0.8}
              threshold={0}
              rootMargin="0px"
              className="text-2xl font-bold"
            />
          )}
          {subtitle && (
            <ShinyText
              text={subtitle}
              speed={4}
              color="hsl(var(--muted-foreground) / 0.9)"
              shineColor="hsl(var(--cohere-action-blue))"
              spread={150}
              disabled={prefersReducedMotion}
              className="text-sm"
            />
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="rounded-cohere-sm">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {!errorMessage && infoMessage && (
            <Alert className="rounded-cohere-sm border-cohere-card-border bg-card/60">
              <AlertDescription>{infoMessage}</AlertDescription>
            </Alert>
          )}
          {children}
          {footer}
        </CardContent>
      </Card>
    </div>
  )
}
