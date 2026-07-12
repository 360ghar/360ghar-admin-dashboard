import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export interface PageBreadcrumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  badge?: string
  breadcrumbs?: PageBreadcrumb[]
  actions?: ReactNode
  className?: string
}

/**
 * Standard page chrome — title, optional description, badge, actions, breadcrumbs.
 * Prefer this over freehand h1 layouts so list/detail pages share hierarchy.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  useDocumentTitle(title)

  return (
    <div className={cn('space-y-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-foreground transition-colors truncate max-w-[12rem] sm:max-w-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn('truncate max-w-[12rem] sm:max-w-none', isLast && 'text-foreground font-medium')}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="shrink-0 rounded-cohere-sm bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" aria-hidden />
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl truncate">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {(badge || actions) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {badge && (
              <Badge variant="secondary" className="px-3 py-1">
                {badge}
              </Badge>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
