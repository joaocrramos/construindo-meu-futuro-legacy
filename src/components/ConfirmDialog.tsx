import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  requirePhrase?: string
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  requirePhrase,
  onConfirm,
}: ConfirmDialogProps) {
  const [typedPhrase, setTypedPhrase] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setTypedPhrase('')
    }
  }, [open])

  const isConfirmed = !requirePhrase || typedPhrase.trim() === requirePhrase.trim()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span>{description}</span>
            {requirePhrase && (
              <div className="pt-2 text-left space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Para confirmar, digite exatamente:{' '}
                  <span className="font-mono text-destructive">{requirePhrase}</span>
                </Label>
                <Input
                  value={typedPhrase}
                  onChange={(e) => setTypedPhrase(e.target.value)}
                  placeholder={requirePhrase}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isConfirmed}
            onClick={(e) => {
              if (!isConfirmed) {
                e.preventDefault()
                return
              }
              onConfirm()
            }}
            className={
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50'
                : ''
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
