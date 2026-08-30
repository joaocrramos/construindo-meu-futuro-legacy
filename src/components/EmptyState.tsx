import * as React from 'react'
import { LucideIcon, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  nextStepGuide?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  onSecondaryAction?: () => void
  badge?: string
  className?: string
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  nextStepGuide,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  badge,
  className = '',
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed border-border/80 bg-card/50 shadow-none ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform hover:scale-105">
          <Icon className="h-8 w-8 text-primary" />
          {badge && (
            <span className="absolute -top-1 -right-1 flex h-5 px-1.5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground border border-background">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>

        {nextStepGuide && (
          <div className="mb-6 w-full max-w-md rounded-lg bg-secondary/50 border border-border/60 p-3 text-left">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                i
              </span>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-medium">Próximo passo recomendado: </strong>
                {nextStepGuide}
              </div>
            </div>
          </div>
        )}

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actionLabel &&
              (actionHref ? (
                <Button asChild className="h-9 px-4 text-xs font-medium shadow-sm">
                  <Link to={actionHref}>{actionLabel}</Link>
                </Button>
              ) : (
                <Button onClick={onAction} className="h-9 px-4 text-xs font-medium shadow-sm">
                  {actionLabel}
                </Button>
              ))}
            {secondaryActionLabel &&
              (secondaryActionHref ? (
                <Button asChild variant="outline" className="h-9 px-4 text-xs font-medium">
                  <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onSecondaryAction}
                  className="h-9 px-4 text-xs font-medium"
                >
                  {secondaryActionLabel}
                </Button>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
