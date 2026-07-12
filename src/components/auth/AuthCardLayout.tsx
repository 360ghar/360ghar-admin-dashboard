import type { ReactNode } from 'react'
import { Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
 * Provides the centered card with icon, title, alerts, and optional footer.
 */
export function AuthCardLayout({
  title,
  subtitle,
  errorMessage,
  infoMessage,
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md border border-cohere-card-border bg-card">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {!errorMessage && infoMessage && (
            <Alert>
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
