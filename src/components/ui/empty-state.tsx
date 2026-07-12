import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  }
  /** `sm` for popovers / constrained chrome; `md` for full page sections. */
  size?: 'sm' | 'md'
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = ''
}: EmptyStateProps) {
  const isSm = size === 'sm'
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent
        className={cn(
          'flex flex-col items-center justify-center text-center',
          isSm ? 'space-y-3 p-6' : 'space-y-4 p-12',
        )}
      >
        {icon && (
          <div className={cn('text-muted-foreground', isSm && '[&_svg]:h-8 [&_svg]:w-8')}>
            {icon}
          </div>
        )}
        <div className="space-y-2">
          <h3 className={cn('font-semibold', isSm ? 'text-base' : 'text-lg')}>{title}</h3>
          {description && (
            <p className={cn('text-muted-foreground max-w-md', isSm ? 'text-sm' : undefined)}>
              {description}
            </p>
          )}
        </div>
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3">
            {action && (
              <Button variant={action.variant || 'default'} onClick={action.onClick} size={isSm ? 'sm' : 'default'}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || 'outline'}
                onClick={secondaryAction.onClick}
                size={isSm ? 'sm' : 'default'}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}