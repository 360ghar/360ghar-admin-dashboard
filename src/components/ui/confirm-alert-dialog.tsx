import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
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
import { getErrorMessage } from '@/lib/errors'

interface ConfirmAlertDialogProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  children?: (openDialog: () => void) => React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const ConfirmAlertDialog: React.FC<ConfirmAlertDialogProps> = ({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = controlledOpen ?? internalOpen
  const pendingRef = useRef(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (pendingRef.current && !nextOpen) return
    if (nextOpen) setError(null)
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault() // Radix would close the dialog before the request settles.
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      pendingRef.current = false
      setPending(false)
      if (controlledOpen === undefined) setInternalOpen(false)
      onOpenChange?.(false)
    } catch (cause) {
      setError(getErrorMessage(cause, 'The action failed. Try again.'))
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <>
      {children?.(() => handleOpenChange(true))}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { void handleConfirm(event) }}
              disabled={pending}
              aria-busy={pending}
              className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {pending ? `${confirmLabel}…` : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { ConfirmAlertDialog }
