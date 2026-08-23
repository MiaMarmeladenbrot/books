import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className="bg-card m-auto w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl p-6 shadow-[0_24px_50px_-20px_rgb(30_26_21/0.55)] backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
    >
      <h2 className="font-serif mb-2 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-ink-2 mb-6 text-sm leading-relaxed">{description}</p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="border-danger text-danger rounded-xl border py-3.5 text-[15px] font-semibold"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="bg-ink text-paper rounded-xl py-3.5 text-[15px] font-semibold"
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  )
}
