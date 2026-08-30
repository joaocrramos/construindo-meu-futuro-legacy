import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  badge?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  React.useEffect(() => {
    if (title) {
      document.title = `${title} · Construindo Meu Futuro`
    }
  }, [title])

  return (
    <div className="flex flex-col gap-3 pb-6 border-b border-border/60 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <span>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            {title}
          </h1>
          {badge && (
            <Badge variant="secondary" className="text-xs font-normal">
              {badge}
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 pt-2 sm:pt-0">{actions}</div>}
    </div>
  )
}
